import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { FeatureCollection, Polygon } from 'geojson';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LegalDocumentType } from '../beneficiaries/legal-document';
import { Cell, boundingBoxOf } from './plot-cells';

/** The plots a map view shows, as sgt answers them: GeoJSON on WGS84. */
export type PlotsInView = FeatureCollection<Polygon, { ubigeo: string }> & {
  /** More plots touch the view than sgt answers at once; zooming in shows them all. */
  truncated: boolean;
};

export type UtmZone = 'ZONE_17S' | 'ZONE_18S' | 'ZONE_19S';

/** A surveyed plot to register; sgt works out the district it lies in from the boundary. */
export interface PlotRegistration {
  ownerDocumentType: LegalDocumentType;
  ownerDocumentNumber: string;
  utmZone: UtmZone;
  boundary: { easting: number; northing: number }[];
}

export interface RegisteredPlot {
  id: string;
  ownerDocumentType: string;
  ownerDocumentNumber: string;
  ubigeo: string;
  utmZone: UtmZone;
  boundary: { easting: number; northing: number }[];
  registrationDate: string;
}

@Injectable({ providedIn: 'root' })
export class PlotsApi {
  private readonly http = inject(HttpClient);

  /**
   * @param fresh whether to skip the browser's cache, which keeps a cell's answer for a while, as
   *              when a plot has just been registered in it
   */
  inCell(cell: Cell, fresh = false): Observable<PlotsInView> {
    return this.within(boundingBoxOf(cell), fresh);
  }

  /** @param bbox west,south,east,north in degrees */
  within(bbox: string, fresh = false): Observable<PlotsInView> {
    return this.http.get<PlotsInView>(`${environment.sgt.api}/plots/within`, {
      params: { bbox },
      cache: fresh ? 'reload' : 'default',
    });
  }

  register(plot: PlotRegistration): Observable<RegisteredPlot> {
    return this.http.post<RegisteredPlot>(`${environment.sgt.api}/plots`, plot);
  }
}
