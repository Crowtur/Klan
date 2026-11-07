import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanCard } from "../src/components/workspace/plan-card";
import { Bars } from "../src/components/workspace/activity";

test("plan cards render the contracted duration, USD, multiline benefits and actual counts", () => {
  for (const benefits of ["Acceso\nReserva", ["Acceso", "Reserva"]]) {
    const html = renderToStaticMarkup(<PlanCard plan={{name:"Club",type:"PAID",durationValue:3,durationUnit:"MONTH",price:35,benefits,activeMembers:2,requiresDocumentation:true,documentRequirements:[{name:"Licencia"}]}}>Editar plan</PlanCard>);
    for (const text of ["3 MESES","USD","2 socios","1 requisito documental","Acceso","Reserva","Editar plan"]) assert.ok(html.includes(text), text);
    assert.equal((html.match(/<li>/g)||[]).length,2);
  }
});

test("daily chart groups adjacent months and identifies a single month in its heading", () => {
  const render = (days:string[]) => renderToStaticMarkup(<Bars title="Ingresos" calendar="day" xAxis="Días" yAxis="USD" series={["Ingresos"]} rows={days.map(label=>({label,values:[5]}))}/>);
  const single = render(["2026-10-31"]);
  assert.match(single,/<h3>Ingresos · octubre de 2026<\/h3>/);
  const multiple = render(["2026-10-31","2026-11-01","2026-11-02"]);
  assert.match(multiple,/grid-column:span 2[^>]*>noviembre de 2026/);
  assert.match(multiple,/<small>1<\/small>/);
  assert.match(multiple,/class="numeric">5/);
});
