
// กำหนดประเภทของ TravelSegment
// ค่าเดินทาง
interface TravelSegment{
    name:string,
    cost:number
}
// วันหยุดหรือวันทำงาน+ยอดรวม
interface TravelDay{
  date:string,
  status:"WORK"|"OFF",
  cost:number
}

interface MonthlyCostResult {
    totalCost:number,
    travelDays:number
}

// ฟั่งชั่นคำนวนยอดรวม
export function calculateRouteCost(segments:TravelSegment[]) {
    // คำนวณทุกหมดโดยถ้ามีก็ คืนค่าที่มีถ้าไม่มีก็ส่งค่าเป็น 0
    return segments.reduce((total,segment)=>{
        return total + segment.cost
    },0)
}

export function calculateSelectedRoutesCost(
  outboundRoute?: { segments: TravelSegment[] } | null,
  returnRoute?: { segments: TravelSegment[] } | null
): number | undefined {
  const selectedRoutes = [outboundRoute, returnRoute].filter(
    (route): route is { segments: TravelSegment[] } => Boolean(route)
  );

  if (selectedRoutes.length === 0) {
    return undefined;
  }

  return selectedRoutes.reduce(
    (total, route) => total + calculateRouteCost(route.segments),
    0
  );
}
// ฟั่งชั่นคำนวนค่าไปค่ากับรวมกันต่อวัน
export function calculateDailyCost(outbound:TravelSegment[],returnRoute:TravelSegment[]):number {
    const outboundCost = calculateRouteCost(outbound)
    const returnCost = calculateRouteCost(returnRoute)

    return outboundCost + returnCost
}

export function calculateMonthlyCost(TravelDays:TravelDay[]):MonthlyCostResult {

  return TravelDays.reduce((result,day)=>{
       
    if(day.status === "WORK"){
       result.totalCost += day.cost
       result.travelDays += 1
    }

    return result

   },{
    totalCost:0,travelDays:0
   })



}


