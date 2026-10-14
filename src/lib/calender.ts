interface CalenderDay {
    date:string,
    status:"WORK" | "OFF",
    cost:number
}


export function generateMonthDays(year:number,month:number,workDays:number[],offDates:string[],DefaultDailyCost:number):CalenderDay[] {
 
     const dayInMonth = new Date(year,month , 0).getDate()
    const calenderDay:CalenderDay[] = []

    for(let day = 1; day <= dayInMonth;day++){
     const date = new Date(year,month - 1,day)

     const dayOfWeek = date.getDay()
     const isWorkDay = workDays.includes(dayOfWeek)
     const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isOffDate = offDates.includes(dateString);
    const isWork = isWorkDay && !isOffDate;
   
    if(isWork){
        calenderDay.push({
          date:dateString,
          status:"WORK",
          cost:DefaultDailyCost,
        })
    }else{
        calenderDay.push({
          date:dateString,
          status:"OFF",
          cost:0
        })

    }}
  return calenderDay;
}

