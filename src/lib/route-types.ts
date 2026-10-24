export interface TravelRouteSegment {
  _id?: string;
  name: string;
  cost: number;
}

export interface TravelRoute {
  _id: string;
  name: string;
  type: "OUTBOUND" | "RETURN";
  segments: TravelRouteSegment[];
}

export interface TravelRouteForm {
  name: string;
  type: TravelRoute["type"];
  segments: Array<Pick<TravelRouteSegment, "name"> & { cost: number | "" }>;
}
