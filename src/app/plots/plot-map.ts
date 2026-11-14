import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { NgOptimizedImage } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  Map as MapLibreMap,
  NavigationControl,
  StyleSpecification,
  setWorkerUrl,
} from 'maplibre-gl';
import { EMPTY, Subject, catchError, debounceTime, mergeMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { showCellGrid } from './debug-cell-grid'; // TEMPORARY: cell grid
import { LoadedCells } from './loaded-cells';
import { Cell, cellsAround } from './plot-cells';
import { DraftedPlot, perimeterOf } from './plot-draft';
import { addPlotLayers, showPlots } from './plot-layers';
import { addPlotPreviewLayer, flyToPlotPreview, glideToPlotPreview, showPlotPreview } from './plot-preview-layer';
import { PlotsApi } from './plots-api';
import { CreatePlotDialog } from './create-plot-dialog';

/**
 * MapLibre parses GeoJSON in a web worker loaded from its own file, which the build copies next to
 * the app (see angular.json) rather than bundling.
 */
setWorkerUrl(new URL('maplibre/maplibre-gl-worker.mjs', document.baseURI).href);

const PERU: [number, number] = [-75.0, -9.2];
const COUNTRY_ZOOM = 5;
/** How long the view has to rest before its plots are asked for, so a pan asks once, not per frame. */
const SETTLE_MS = 250;
const PARALLEL_REQUESTS = 6;

type DraftCheck = 'NONE' | 'CLEAR' | 'CROSSING';
const DRAFT_LABELS: Record<DraftCheck, string> = {
  NONE: 'plotMap.createPlot',
  CLEAR: 'plotMap.draftClear',
  CROSSING: 'plotMap.draftCrossing',
};

/**
 * The plots around the view, drawn with MapLibre. Each time the view settles, what is already loaded
 * shows at once, and only the cells around it not loaded yet are asked from sgt.
 */
@Component({
  selector: 'app-plot-map',
  host: { class: 'block h-full' },
  imports: [NgOptimizedImage, TranslocoPipe],
  template: `
    <main class="relative h-full w-full">
      <div #map class="h-full w-full"></div>

      <!-- Anything laid over the map goes here; only what it holds takes clicks, the rest reach the map. -->
      <div class="pointer-events-none absolute inset-0">
        <!-- Level with MapLibre's controls, which sit 10px in from the top and right and are 29px wide. -->
        <div class="absolute top-[10px] right-[49px] flex items-center gap-sm">
          @if (draftCheck() !== 'NONE') {
            <div class="group pointer-events-auto relative">
              <button
                type="button"
                [attr.aria-label]="'plotMap.goToDraft' | transloco"
                (click)="goToDraftedPlot()"
                class="grid size-10 place-items-center rounded-full bg-bg-surface text-text-primary shadow-md hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="5.5" stroke="currentColor" stroke-width="1.75" />
                  <circle cx="10" cy="10" r="1.75" fill="currentColor" />
                  <path d="M10 1.5V4M10 16V18.5M1.5 10H4M16 10H18.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                </svg>
              </button>
              <span
                aria-hidden="true"
                class="pointer-events-none absolute top-1/2 right-full mr-sm -translate-y-1/2 rounded-md bg-bg-inverse px-sm py-xs text-label-sm whitespace-nowrap text-text-on-inverse opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-has-focus-visible:opacity-100"
              >
                {{ 'plotMap.goToDraft' | transloco }}
              </span>
            </div>
          }
          <div class="group pointer-events-auto relative">
            @let check = draftCheck();
            @let label = draftLabel() | transloco;
            <button
              type="button"
              aria-haspopup="dialog"
              [attr.aria-label]="label"
              (click)="openCreatePlotDialog()"
              class="relative grid size-14 place-items-center rounded-full bg-bg-surface shadow-md transition-shadow hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
              [class.ring-3]="check !== 'NONE'"
              [class.ring-status-success]="check === 'CLEAR'"
              [class.ring-status-error]="check === 'CROSSING'"
            >
              <img ngSrc="/images/sgt-icon-centered.svg" width="40" height="40" alt="" />
              @if (check !== 'NONE') {
                <span
                  aria-hidden="true"
                  class="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full text-text-on-inverse shadow-md ring-2 ring-bg-surface"
                  [class.bg-status-success]="check === 'CLEAR'"
                  [class.bg-status-error]="check === 'CROSSING'"
                >
                  @if (check === 'CLEAR') {
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path d="M4.5 10.5L8.25 14.25L15.5 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  } @else {
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4.5V11" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                      <circle cx="10" cy="15" r="1.5" fill="currentColor" />
                    </svg>
                  }
                </span>
              }
            </button>
            <span
              aria-hidden="true"
              class="pointer-events-none absolute top-1/2 right-full mr-sm -translate-y-1/2 rounded-md bg-bg-inverse px-sm py-xs text-label-sm whitespace-nowrap text-text-on-inverse opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-has-focus-visible:opacity-100"
            >
              {{ label }}
            </span>
          </div>
        </div>
      </div>
    </main>
  `,
})
export class PlotMap {
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly plotsApi = inject(PlotsApi);
  private readonly dialog = inject(Dialog);
  private readonly destroyRef = inject(DestroyRef);
  /** The map, once it has loaded and its layers can be drawn in. */
  private readonly loadedMap = signal<MapLibreMap | null>(null);

  /**
   * The plot last looked at from the form, shown on the map until the form closes again with
   * another or with nothing. Only here, in memory: reloading the page drops it.
   */
  private readonly draftedPlot = signal<DraftedPlot | null>(null);
  private readonly preview = computed(() => {
    const drafted = this.draftedPlot();
    return drafted ? perimeterOf(drafted.plot) : null;
  });

  protected readonly draftCheck = computed<DraftCheck>(() => {
    const drafted = this.draftedPlot();
    if (!drafted) {
      return 'NONE';
    }
    return drafted.crossing ? 'CROSSING' : 'CLEAR';
  });
  protected readonly draftLabel = computed(() => DRAFT_LABELS[this.draftCheck()]);

  constructor() {
    effect(() => {
      const map = this.loadedMap();
      if (map) {
        showPlotPreview(map, this.preview(), this.draftedPlot()?.crossing ?? false);
      }
    });
    effect(() => {
      const map = this.loadedMap();
      if (map) {
        flyToPlotPreview(map, this.preview());
      }
    });

    afterNextRender(() => {
      const map = new MapLibreMap({
        container: this.container().nativeElement,
        style: basemap(),
        center: PERU,
        zoom: COUNTRY_ZOOM,
      });
      map.addControl(new NavigationControl());
      this.destroyRef.onDestroy(() => map.remove());

      map.on('load', () => {
        addPlotLayers(map, {
          plot: token('--color-brand-primary'),
          label: token('--color-text-on-primary'),
        });
        addPlotPreviewLayer(map, {
          plot: token('--color-status-success'),
          crossing: token('--color-status-error'),
        });
        this.showPlotsInView(map);
        showCellGrid(map); // TEMPORARY: cell grid
        this.loadedMap.set(map);
      });
    });
  }

  protected goToDraftedPlot(): void {
    const map = this.loadedMap();
    const perimeter = this.preview();
    if (map && perimeter) {
      glideToPlotPreview(map, perimeter);
    }
  }

  protected openCreatePlotDialog(): void {
    this.dialog
      .open<DraftedPlot, DraftedPlot | null>(CreatePlotDialog, {
        data: this.draftedPlot(),
        ariaLabelledBy: CreatePlotDialog.titleId,
        backdropClass: 'bg-overlay-scrim',
      })
      .closed.subscribe((drafted) => this.draftedPlot.set(drafted ?? null));
  }

  private showPlotsInView(map: MapLibreMap): void {
    const cells = new LoadedCells();
    const settledViews = new Subject<void>();
    const cellsInView = () => cellsAround(map.getBounds(), map.getZoom());
    const drawLoadedPlots = () => showPlots(map, cells.plotsIn(cellsInView()));

    settledViews
      .pipe(
        debounceTime(SETTLE_MS),
        tap(drawLoadedPlots),
        mergeMap(() => cells.claimMissing(cellsInView())),
        mergeMap((cell) => this.load(cell, cells), PARALLEL_REQUESTS),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(drawLoadedPlots);

    map.on('moveend', () => settledViews.next());
    settledViews.next();
  }

  private load(cell: Cell, cells: LoadedCells) {
    return this.plotsApi.inCell(cell).pipe(
      tap((plots) => cells.store(cell, plots)),
      catchError(() => {
        cells.release(cell);
        return EMPTY;
      }),
    );
  }
}

function basemap(): StyleSpecification {
  const { basemapTiles, basemapAttribution, glyphs } = environment.map;

  return {
    version: 8,
    glyphs,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [basemapTiles],
        tileSize: 256,
        maxzoom: 19,
        attribution: basemapAttribution,
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  };
}

/** A design token's value, so the map takes the colours the rest of the app uses. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
