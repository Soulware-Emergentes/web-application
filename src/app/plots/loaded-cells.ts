import type { Feature, FeatureCollection, Polygon } from 'geojson';
import { Cell, keyOf, parentOf } from './plot-cells';
import { PlotsInView } from './plots-api';

/** As long as sgt lets the browser keep a cell's answer; past it the cell is asked for again. */
const FRESH_FOR_MS = 60_000;

interface LoadedCell {
  plots: PlotsInView;
  loadedAt: number;
}

/**
 * The cells of plots this map has already loaded. A cell needs no request when it, or a coarser cell
 * holding it, came back fresh and complete: everything inside it is already here.
 */
export class LoadedCells {
  private readonly loaded = new Map<string, LoadedCell>();
  private readonly loading = new Set<string>();
  /** Cells forgotten and not loaded again since, whose answer the browser may still hold. */
  private readonly forgotten = new Set<string>();

  /** The cells among these that nobody has loaded or is loading, now marked as loading. */
  claimMissing(cells: Cell[]): Cell[] {
    const missing = cells.filter((cell) => !this.coveringCell(cell, true) && !this.loading.has(keyOf(cell)));
    missing.forEach((cell) => this.loading.add(keyOf(cell)));
    return missing;
  }

  store(cell: Cell, plots: PlotsInView): void {
    this.loading.delete(keyOf(cell));
    this.forgotten.delete(keyOf(cell));
    this.loaded.set(keyOf(cell), { plots, loadedAt: Date.now() });
  }

  release(cell: Cell): void {
    this.loading.delete(keyOf(cell));
  }

  /**
   * Has every loaded cell asked for again, for when a plot has just been registered. Until each
   * comes back, what it held still shows.
   */
  forget(): void {
    this.loaded.forEach((cell, key) => {
      cell.loadedAt = 0;
      this.forgotten.add(key);
    });
  }

  /** Whether the cell was forgotten, so its answer has to come from sgt rather than the browser's cache. */
  wasForgotten(cell: Cell): boolean {
    return this.forgotten.has(keyOf(cell));
  }

  /** Every loaded plot in these cells, once each even when it crosses into several. */
  plotsIn(cells: Cell[]): FeatureCollection<Polygon> {
    const plots = new Map<string | number, Feature<Polygon>>();
    for (const cell of cells) {
      for (const plot of this.coveringCell(cell, false)?.plots.features ?? []) {
        plots.set(plot.id ?? plots.size, plot);
      }
    }
    return { type: 'FeatureCollection', features: [...plots.values()] };
  }

  /**
   * The cell itself when loaded, else the nearest coarser cell holding all of its plots; only among
   * those still fresh when asked to.
   */
  private coveringCell(cell: Cell, onlyFresh: boolean): LoadedCell | null {
    const own = this.usable(cell, onlyFresh);
    if (own) {
      return own;
    }

    for (let parent = parentOf(cell); parent; parent = parentOf(parent)) {
      const coarser = this.usable(parent, onlyFresh);
      if (coarser && !coarser.plots.truncated) {
        return coarser;
      }
    }
    return null;
  }

  private usable(cell: Cell, onlyFresh: boolean): LoadedCell | null {
    const loaded = this.loaded.get(keyOf(cell));
    return loaded && (!onlyFresh || Date.now() - loaded.loadedAt < FRESH_FOR_MS) ? loaded : null;
  }
}
