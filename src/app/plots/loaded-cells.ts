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

  /** The cells among these that nobody has loaded or is loading, now marked as loading. */
  claimMissing(cells: Cell[]): Cell[] {
    const missing = cells.filter((cell) => !this.coveringCell(cell) && !this.loading.has(keyOf(cell)));
    missing.forEach((cell) => this.loading.add(keyOf(cell)));
    return missing;
  }

  store(cell: Cell, plots: PlotsInView): void {
    this.loading.delete(keyOf(cell));
    this.loaded.set(keyOf(cell), { plots, loadedAt: Date.now() });
  }

  release(cell: Cell): void {
    this.loading.delete(keyOf(cell));
  }

  /** Every loaded plot in these cells, once each even when it crosses into several. */
  plotsIn(cells: Cell[]): FeatureCollection<Polygon> {
    const plots = new Map<string | number, Feature<Polygon>>();
    for (const cell of cells) {
      for (const plot of this.coveringCell(cell)?.plots.features ?? []) {
        plots.set(plot.id ?? plots.size, plot);
      }
    }
    return { type: 'FeatureCollection', features: [...plots.values()] };
  }

  /** The cell itself when loaded, else the nearest coarser cell holding all of its plots. */
  private coveringCell(cell: Cell): LoadedCell | null {
    const own = this.fresh(cell);
    if (own) {
      return own;
    }

    for (let parent = parentOf(cell); parent; parent = parentOf(parent)) {
      const coarser = this.fresh(parent);
      if (coarser && !coarser.plots.truncated) {
        return coarser;
      }
    }
    return null;
  }

  private fresh(cell: Cell): LoadedCell | null {
    const loaded = this.loaded.get(keyOf(cell));
    return loaded && Date.now() - loaded.loadedAt < FRESH_FOR_MS ? loaded : null;
  }
}
