import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";
import TravelRoute from "@/app/Models/TravelRoute";
import { TravelRouteSchema } from "@/schemas/TravelRouteSchema";

export async function POST(req:Request) {
    await connectDB()

   const body: unknown = await req.json()

   const result = TravelRouteSchema.safeParse(body)

   console.log(result)

    
  const newTravelRoute = await TravelRoute.create(result.data)

  

 return NextResponse.json({newTravelRoute},{status:200})
}

export async function GET() {
    await connectDB()
    
    const Routes = await TravelRoute.find()

   

    return NextResponse.json({Routes},{status:200})

}