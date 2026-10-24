import mongoose from "mongoose";

import TravelRoute from "@/app/Models/TravelRoute";
import { TravelRouteSchema } from "@/schemas/TravelRouteSchema";

export type RouteSelectionResult =
  | { route: InstanceType<typeof TravelRoute> | null }
  | { error: { status: 400 | 404; message: string } };

export async function findValidatedRouteSelection(
  id: string | null | undefined,
  expectedType: "OUTBOUND" | "RETURN",
  session?: mongoose.ClientSession
): Promise<RouteSelectionResult> {
  if (id === null || id === undefined) {
    return { route: null };
  }

  if (!mongoose.isValidObjectId(id)) {
    return { error: { status: 400, message: "Route ID ไม่ถูกต้อง" } };
  }

  const query = TravelRoute.findById(id);
  if (session) query.session(session);

  const route = await query;
  if (!route) {
    return { error: { status: 404, message: "ไม่พบ Route ที่เลือก" } };
  }

  const validation = TravelRouteSchema.safeParse({
    name: route.name,
    type: route.type,
    segments: route.segments.map((segment: { name: string; cost: number }) => ({
      name: segment.name,
      cost: segment.cost,
    })),
  });

  if (!validation.success) {
    return { error: { status: 400, message: "ข้อมูล Route ไม่ถูกต้อง" } };
  }

  if (route.type !== expectedType) {
    return {
      error: { status: 400, message: "ประเภท Route ไม่ตรงกับช่องที่เลือก" },
    };
  }

  return { route };
}
