import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, applyEach, form, required, submit, validate } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { firstValueFrom, forkJoin, map, timer } from 'rxjs';
import { BeneficiariesApi } from '../beneficiaries/beneficiaries-api';
import {
  DOCUMENT_NUMBER_FORMATS,
  LEGAL_DOCUMENT_TYPES,
  LegalDocument,
} from '../beneficiaries/legal-document';
import {
  areaInHectares,
  completeVertices,
  emptyVertex,
  previewPoints,
  verticesFromStationFile,
} from './perimeter';
import { overlaps } from './overlap';
import {
  CreatePlotOutcome,
  DraftedPlot,
  MIN_VERTICES,
  NewPlot,
  UTM_ZONE,
  boundingBoxOf,
  emptyPlot,
  perimeterOf,
  sameVertices,
} from './plot-draft';
import { PlotRegistration, PlotsApi } from './plots-api';

/** What sgt answers a plot it refuses for crossing registered ones with. */
const OVERLAPPING_PLOT = 'error.plots.overlapping-plot';

/** The shortest a beneficiary check shows as under way, so it reads as a check even when the registry answers at once. */
const CHECK_MIN_MS = 900;
const PREVIEW_WIDTH = 340;
const PREVIEW_HEIGHT = 168;

/**
 * The form a plot is registered with: its beneficiary and the perimeter the survey measured. It
 * opens with the plot last looked at on the map, if any, and offers to register it only while its
 * vertices are still the ones looked at; otherwise it offers to look at them on the map first. It
 * closes with a {@link CreatePlotOutcome}, or with nothing when dismissed.
 */
@Component({
  selector: 'app-create-plot-dialog',
  imports: [DecimalPipe, FormField, NgOptimizedImage, TranslocoPipe],
  host: {
    class:
      'flex max-h-[calc(100dvh-2rem)] w-[1040px] max-w-[calc(100vw-2rem)] flex-col gap-xl overflow-auto rounded-xl bg-bg-surface p-2xl shadow-lg',
  },
  templateUrl: './create-plot-dialog.html',
})
export class CreatePlotDialog {
  static readonly titleId = 'create-plot-dialog-title';

  protected readonly titleId = CreatePlotDialog.titleId;
  protected readonly previewWidth = PREVIEW_WIDTH;
  protected readonly previewHeight = PREVIEW_HEIGHT;
  protected readonly documentTypes = LEGAL_DOCUMENT_TYPES;
  protected readonly zone = UTM_ZONE.replace('ZONE_', '');
  protected readonly dialogRef = inject<DialogRef<CreatePlotOutcome>>(DialogRef);
  private readonly plotsApi = inject(PlotsApi);
  private readonly beneficiariesApi = inject(BeneficiariesApi);

  /** The plot as last looked at on the map, which editing leaves as it was. */
  private readonly drafted = inject<DraftedPlot | null>(DIALOG_DATA);
  /** The plot as being edited. */
  private readonly plot = signal<NewPlot>(this.drafted?.plot ?? emptyPlot());
  /** Whether there is a drafted plot on the map to throw away. */
  protected readonly hasDraft = this.drafted !== null;
  protected readonly reviewed = computed(
    () => this.drafted !== null && sameVertices(this.drafted.plot.vertices, this.plot().vertices),
  );
  /** Whether the plot looked at looked like it crossed a registered one, while it is still the one being edited. */
  protected readonly crossing = computed(() => (this.reviewed() ? this.drafted!.crossing : null));
  /** Whether the plot being edited is the one refused for crossing registered plots. */
  protected readonly refused = computed(() => this.reviewed() && this.drafted!.refused);

  protected readonly plotForm = form(this.plot, (path) => {
    required(path.documentNumber, { message: 'createPlot.errors.documentRequired' });
    validate(path.documentNumber, ({ value, valueOf }) => {
      const type = valueOf(path.documentType);
      return value() === '' || DOCUMENT_NUMBER_FORMATS[type].test(value())
        ? null
        : { kind: 'documentFormat', message: `createPlot.errors.documentFormat.${type}` };
    });
    applyEach(path.vertices, (vertex) => {
      required(vertex.easting, { message: 'createPlot.errors.coordinateRequired' });
      required(vertex.northing, { message: 'createPlot.errors.coordinateRequired' });
    });
    validate(path.vertices, ({ value }) =>
      value().length < MIN_VERTICES ? { kind: 'tooFewVertices', message: 'createPlot.errors.tooFewVertices' } : null,
    );
  });

  /** The document entered, once its number is a whole one, so the registry is only asked about those. */
  private readonly completeDocument = computed(
    (): LegalDocument | undefined => {
      const { documentType: type, documentNumber: number } = this.plot();
      return DOCUMENT_NUMBER_FORMATS[type].test(number) ? { type, number } : undefined;
    },
    { equal: (before, after) => before?.type === after?.type && before?.number === after?.number },
  );
  /** Who holds the document entered, as the beneficiary registry names them: null when nobody does. */
  protected readonly beneficiary = rxResource({
    params: () => this.completeDocument(),
    stream: ({ params: document }) =>
      forkJoin([this.beneficiariesApi.nameOf(document), timer(CHECK_MIN_MS)]).pipe(map(([name]) => name)),
  });

  private readonly corners = computed(() => completeVertices(this.plot().vertices));
  protected readonly closes = computed(() => this.corners().length >= MIN_VERTICES);
  protected readonly area = computed(() => (this.closes() ? areaInHectares(this.corners()) : null));
  protected readonly preview = computed(() =>
    this.closes() ? previewPoints(this.corners(), PREVIEW_WIDTH, PREVIEW_HEIGHT) : null,
  );

  protected readonly stationFileEmpty = signal(false);
  protected readonly checkingCrossings = signal(false);
  protected readonly crossingCheckFailed = signal(false);
  /** The last save that failed: with sgt's own words when it refused the plot, without them otherwise. */
  protected readonly saveFailure = signal<{ reason: string | null } | null>(null);

  /** Looks for registered plots the perimeter crosses, then closes to show it on the map. */
  protected async showOnMap(): Promise<void> {
    const plot = this.plot();
    const perimeter = perimeterOf(plot);
    this.checkingCrossings.set(true);
    this.crossingCheckFailed.set(false);
    try {
      const around = await firstValueFrom(this.plotsApi.within(boundingBoxOf(perimeter)));
      const crossing = around.features.some((registered) => overlaps(perimeter, registered.geometry));
      this.dialogRef.close({ kind: 'DRAFTED', drafted: { plot, crossing, refused: false } });
    } catch {
      this.crossingCheckFailed.set(true);
    } finally {
      this.checkingCrossings.set(false);
    }
  }

  protected discard(): void {
    this.dialogRef.close({ kind: 'DISCARDED' });
  }

  protected addVertex(): void {
    this.plot.update((plot) => ({ ...plot, vertices: [...plot.vertices, emptyVertex()] }));
  }

  protected removeVertex(index: number): void {
    this.plot.update((plot) => ({ ...plot, vertices: plot.vertices.filter((_, at) => at !== index) }));
  }

  protected chooseStationFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.loadStationFile(input.files?.[0]);
    input.value = '';
  }

  protected dropStationFile(event: DragEvent): void {
    event.preventDefault();
    this.loadStationFile(event.dataTransfer?.files[0]);
  }

  protected async save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!this.reviewed()) {
      return;
    }
    this.saveFailure.set(null);
    await submit(this.plotForm, async () => {
      try {
        const registered = await firstValueFrom(this.plotsApi.register(this.registration()));
        this.dialogRef.close({ kind: 'REGISTERED', registered });
      } catch (error) {
        const crossedPlots = crossedPlotsOf(error);
        if (crossedPlots) {
          this.dialogRef.close({
            kind: 'REFUSED',
            drafted: { plot: this.plot(), crossing: true, refused: true },
            crossedPlots,
          });
        } else {
          this.saveFailure.set({ reason: refusalOf(error) });
        }
      }
    });
  }

  private registration(): PlotRegistration {
    const { documentType, documentNumber, vertices } = this.plot();
    return {
      ownerDocumentType: documentType,
      ownerDocumentNumber: documentNumber,
      utmZone: UTM_ZONE,
      boundary: completeVertices(vertices),
    };
  }

  private async loadStationFile(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }
    const vertices = verticesFromStationFile(await file.text());
    this.stationFileEmpty.set(vertices.length === 0);
    if (vertices.length > 0) {
      this.plot.update((plot) => ({ ...plot, vertices }));
    }
  }
}

/** What sgt answers a refusal with: which one it is, in its words, and what it involves. */
interface Refusal {
  code?: string;
  message?: string;
  details?: { overlappingPlots?: string[] };
}

function refusalBodyOf(error: unknown): Refusal | null {
  return error instanceof HttpErrorResponse && typeof error.error === 'object' && error.error !== null
    ? (error.error as Refusal)
    : null;
}

/** sgt's own message for a refusal it explains, or null for a failure it does not, such as no connection. */
function refusalOf(error: unknown): string | null {
  const message = refusalBodyOf(error)?.message;
  return typeof message === 'string' ? message : null;
}

/** The registered plots sgt refused the plot for crossing, or null when it refused it for something else. */
function crossedPlotsOf(error: unknown): string[] | null {
  const refusal = refusalBodyOf(error);
  return refusal?.code === OVERLAPPING_PLOT ? (refusal.details?.overlappingPlots ?? []) : null;
}
