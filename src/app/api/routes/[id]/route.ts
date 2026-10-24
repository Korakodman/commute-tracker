import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import TravelRoute from "@/app/Models/TravelRoute";
import { TravelRouteSchema } from "@/schemas/TravelRouteSchema";
import mongoose from "mongoose";

const UpdateTravelRouteSchema = TravelRouteSchema.partial();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "ID ไม่ถูกต้อง" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "ข้อมูล JSON ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const result = UpdateTravelRouteSchema.safeParse(body);

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

    const updateRoute = await TravelRoute.findByIdAndUpdate(
      id,
      result.data,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!updateRoute) {
      return NextResponse.json(
        { message: "ไม่พบ Route ที่ต้องการแก้ไข" },
        { status: 404 }
      );
    }

    return NextResponse.json({ updateRoute }, { status: 200 });
  } catch (error: unknown) {
    console.error("Update TravelRoute failed:", error);

    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการแก้ไข Route" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ message: "ID ไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    await connectDB();
    const deletedRoute = await TravelRoute.findByIdAndDelete(id);

    if (!deletedRoute) {
      return NextResponse.json(
        { message: "ไม่พบ Route ที่ต้องการลบ" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "ลบสำเร็จ", deletedRoute },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Delete TravelRoute failed:", error);

    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดในการลบ Route" },
      { status: 500 }
    );
  }
}
