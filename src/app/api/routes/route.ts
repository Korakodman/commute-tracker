import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import TravelRoute from "@/app/Models/TravelRoute";
import { TravelRouteSchema } from "@/schemas/TravelRouteSchema";

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "ข้อมูล JSON ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const result = TravelRouteSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      {
        message: "ข้อมูลไม่ถูกต้อง",
        errors: result.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const newTravelRoute = await TravelRoute.create(result.data);

    return NextResponse.json({ newTravelRoute }, { status: 200 });
  } catch (error: unknown) {
    console.error("Create TravelRoute failed:", error);

    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการสร้าง Route" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const Routes = await TravelRoute.find().sort({ _id: 1 });

    return NextResponse.json({ Routes }, { status: 200 });
  } catch (error: unknown) {
    console.error("Get TravelRoutes failed:", error);

    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการโหลด Route" },
      { status: 500 }
    );
  }
}
