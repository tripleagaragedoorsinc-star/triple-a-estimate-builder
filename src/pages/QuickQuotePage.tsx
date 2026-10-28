import {useEffect,useMemo,useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "@/context/AuthContext";
import {fetchSalesPrices,saveEstimate} from "@/lib/data";
import {calculatePricing,formatCurrency} from "@/lib/pricing";
import type {SalesPrice,EstimateOptions,EstimateDoorConfig,EstimateOpenerConfig} from "@/types";
const norm=(v:unknown)=>String(v??"").trim().toLowerCase();
const unique=(a:string[])=>[...new Set(a.filter(Boolean))].sort();
const money=(v:number)=>Math.round(v*100)/100;
export function QuickQuotePage(){
 const {session}=useAuth();const navigate=useNavigate();
 const [prices,setPrices]=useState<SalesPrice[]>([]);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 const [detail,setDetail]=useState(false);const [style,setStyle]=useState("All Styles");const [sizeType,setSizeType]=useState("Any Size");
 const [manufacturer,setManufacturer]=useState("");const [model,setModel]=useState("");const [width,setWidth]=useState("");const [height,setHeight]=useState("");
 const [color,setColor]=useState("");const [windows,setWindows]=useState("");const [measuredWidth,setMeasuredWidth]=useState("");const [measuredHeight,setMeasuredHeight]=useState("");const [lift,setLift]=useState("Not confirmed");const [spring,setSpring]=useState("Not confirmed");const [openerModel,setOpenerModel]=useState("");const [openerRail,setOpenerRail]=useState("");
 const [quantity,setQuantity]=useState(1);const [labor,setLabor]=useState(650);const [discount,setDiscount]=useState(0);
 const [dispose,setDispose]=useState(true);const [oldOpeners,setOldOpeners]=useState(0);
 const [customer,setCustomer]=useState("");const [job,setJob]=useState("");const [notes,setNotes]=useState("");const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
 useEffect(()=>{fetchSalesPrices().then(setPrices).catch(e=>setError(e instanceof Error?e.message:"Unable to load approved prices")).finally(()=>setLoading(false))},[]);
 const doors=useMemo(()=>prices.filter(p=>p.category==="door"),[prices]);
 const openers=useMemo(()=>prices.filter(p=>p.category==="opener"),[prices]);
 const styleName=(p:SalesPrice)=>p.design==="carriage_house"?"Carriage House":p.design==="flush_modern"?"Modern / Flush":p.design==="full_view_glass"?"Modern / Glass":"Standard";
 const shortlist=doors.filter(p=>(style==="All Styles"||styleName(p)===style)&&(sizeType==="Any Size"||(sizeType==="Single"?Number(p.width_ft)<=10:Number(p.width_ft)>10)));
 const pick=(p:SalesPrice)=>{setManufacturer(p.manufacturer);setModel(p.model);setWidth(String(p.width_ft??""));setHeight(String(p.height_ft??""));setColor(p.color||"");setWindows(p.window_option||"No Windows");setMessage("");};
 const manufacturers=unique(doors.map(p=>p.manufacturer));
 const models=unique(doors.filter(p=>!manufacturer||p.manufacturer===manufacturer).map(p=>p.model));
 const candidates=doors.filter(p=>(!manufacturer||p.manufacturer===manufacturer)&&(!model||p.model===model));
 const sizes=unique(candidates.filter(p=>p.width_ft!=null&&p.height_ft!=null).map(p=>p.width_ft+"x"+p.height_ft));
 const selectedSize=width&&height?width+"x"+height:"";
 const filtered=candidates.filter(p=>!selectedSize||p.width_ft+"x"+p.height_ft===selectedSize);
 const colors=unique(filtered.map(p=>p.color||""));
 const filteredColors=filtered.filter(p=>!color||norm(p.color)===norm(color));
 const windowOptions=unique(filteredColors.map(p=>p.window_option||"No Windows"));
 const exactDoor=doors.find(p=>norm(p.manufacturer)===norm(manufacturer)&&norm(p.model)===norm(model)&&Number(p.width_ft)===Number(width)&&Number(p.height_ft)===Number(height)&&norm(p.color)===norm(color)&&norm(p.window_option||"No Windows")===norm(windows||"No Windows"));
 const openerModels=unique(openers.map(p=>p.model));
 const openerRails=unique(openers.filter(p=>p.model===openerModel).map(p=>p.rail_length||""));
 const rail=openerRail||((Number(height)||7)<=7?"7 ft":"8 ft");
 const exactOpener=openerModel?openers.find(p=>norm(p.model)===norm(openerModel)&&norm(p.rail_length)===norm(rail)):undefined;
 const doorPrice=exactDoor?money(Number(exactDoor.standard_price)*(1-discount/100)):0;
 const openerPrice=exactOpener?money(Number(exactOpener.standard_price)*(1-discount/100)):0;
 const options:EstimateOptions={doors:[{manufacturer:manufacturer||"",model:model||"",sku:null,width_ft:Number(width)||0,height_ft:Number(height)||0,color,design:"traditional_raised_panel",panel_type:null,insulation_type:null,window_option:windows||"No Windows",quantity,custom:false,supplier_cost:null,selling_price:doorPrice,discount_percent:discount} as EstimateDoorConfig],openers:openerModel?[{brand:"LiftMaster",model:openerModel,quantity:1,supplier_cost:null,selling_price:openerPrice,discount_percent:discount} as EstimateOpenerConfig]:[],labor_per_door:labor,disposal_enabled:dispose,door_count_for_disposal:quantity,old_opener_disposal_count:oldOpeners,material_discount_percent:discount,tax_rate:0.0625,tax_enabled:true,notes:[notes,"Track/lift: "+lift,"Spring: "+spring,openerModel?"Opener rail: "+rail:""].filter(Boolean).join(" | "),custom:detail};
 const breakdown=calculatePricing(options);
 const measurementConflict=!!exactDoor&&((measuredWidth!==""&&Number(measuredWidth)!==Number(exactDoor.width_ft))||(measuredHeight!==""&&Number(measuredHeight)!==Number(exactDoor.height_ft)));
 const ready=!!exactDoor&&!measurementConflict&&(!openerModel||!!exactOpener)&&!saving;
 const save=async()=>{if(!session||!ready)return;setSaving(true);setError("");try{const result=await saveEstimate(session.user_id,job,customer,"","","",options,"draft");navigate("/estimates/"+result.id)}catch(e){setError(e instanceof Error?e.message:"Unable to save estimate")}finally{setSaving(false)}};
 const copy=async()=>{if(!ready)return;const text=[
 "TRIPLE A GARAGE DOORS — ESTIMATE", "Customer: "+(customer||"Not provided"),"Job reference: "+(job||"Not provided"),
 "Door: "+manufacturer+" "+model+" "+width+"x"+height+" "+color+" "+(windows||"No Windows"),
 "Quantity: "+quantity,"Door materials: "+formatCurrency(doorPrice*quantity),
 openerModel?"Opener: LiftMaster "+openerModel+" / "+rail+" rail — "+formatCurrency(openerPrice):"No new opener",
 "Installation labor: "+formatCurrency(breakdown.laborTotal),
 "Disposal: "+formatCurrency(breakdown.doorDisposalTotal+breakdown.openerDisposalTotal),
 "Estimated tax: "+formatCurrency(breakdown.tax),"ESTIMATED TOTAL: "+formatCurrency(breakdown.total),
 notes?"Technician notes: "+notes:"","Taxability requires confirmation before final quote."].filter(Boolean).join("\\n");
 try{await navigator.clipboard.writeText(text);setMessage("Estimate copied for ServiceTitan.");}catch{setMessage("Clipboard unavailable; use Print / PDF.");}};
 const select=(label:string,value:string,change:(v:string)=>void,values:string[],placeholder:string)=> <label className="form-field"><span>{label}</span><select value={value} onChange={e=>change(e.target.value)}><option value="">{placeholder}</option>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>;
 return <div className="fade-in" style={{maxWidth:950,margin:"0 auto"}}>
  <div className="card"><div className="card-header"><h2>Smart Door Quote</h2></div><p className="text-muted">Pick a door below to fill its verified model, size, finish and windows automatically. Supplier costs are never shown.</p>
  <div className="flex gap-2 mb-4"><button className={"btn "+(!detail?"btn-primary":"btn-outline")} onClick={()=>setDetail(false)}>Quick Quote</button><button className={"btn "+(detail?"btn-primary":"btn-outline")} onClick={()=>setDetail(true)}>Detailed Quote</button></div>
  {error&&<div className="alert alert-error">{error}</div>}
  {!loading&&<div style={{marginBottom:18}}>
   <div className="form-grid">
   <label className="form-field"><span>Door Style</span><select value={style} onChange={e=>setStyle(e.target.value)}>{["All Styles","Standard","Carriage House","Modern / Flush","Modern / Glass"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="form-field"><span>Door Width</span><select value={sizeType} onChange={e=>setSizeType(e.target.value)}>{["Any Size","Single","Double"].map(x=><option key={x}>{x}</option>)}</select></label>
   </div><p className="text-muted">Available priced configurations: {shortlist.length}. Select a card for instant pricing.</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10,maxHeight:360,overflowY:"auto"}}>
   {shortlist.map(p=><button key={p.catalog_id} type="button" onClick={()=>pick(p)} style={{textAlign:"left",background:exactDoor?.catalog_id===p.catalog_id?"#dcecfb":"#f4f7fa",border:exactDoor?.catalog_id===p.catalog_id?"2px solid #1966a6":"1px solid #dce5ed",borderRadius:12,padding:14,color:"#17344e"}}>
   <strong style={{display:"block"}}>{p.manufacturer} {p.model}</strong>
   <span style={{display:"block",fontSize:13,marginTop:5}}>{p.width_ft} × {p.height_ft} ft · {p.color} · {p.window_option||"No Windows"}</span>
   <strong style={{display:"block",marginTop:9,fontSize:17}}>{formatCurrency(Number(p.standard_price))}</strong>
   </button>)}
   </div></div>}
  {loading?<p>Loading approved prices...</p>:<div className="form-grid">
   {select("Manufacturer",manufacturer,v=>{setManufacturer(v);setModel("");setWidth("");setHeight("");setColor("");setWindows("")},manufacturers,"Choose manufacturer")}
   {select("Model",model,v=>{setModel(v);setWidth("");setHeight("");setColor("");setWindows("")},models,"Choose model")}
   {select("Exact Door Size",selectedSize,v=>{const [w,h]=v.split("x");setWidth(w||"");setHeight(h||"");setColor("");setWindows("")},sizes,"Choose available size")}
   {select("Color / Finish",color,v=>{setColor(v);setWindows("")},colors,"Choose available color")}
   {select("Windows",windows,setWindows,windowOptions,"Choose windows")}
   {select("New Opener (optional)",openerModel,v=>{setOpenerModel(v);setOpenerRail("")},openerModels,"No new opener")}
   {openerModel&&select("Opener Rail",openerRail,setOpenerRail,openerRails,"Automatic: "+rail)}
   <label className="form-field"><span>Number of Doors</span><input type="number" min={1} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.floor(Number(e.target.value)||1)))}/></label>
   <label className="form-field"><span>Material Discount (0–20%)</span><input type="number" min={0} max={20} value={discount} onChange={e=>setDiscount(Math.max(0,Math.min(20,Number(e.target.value)||0)))}/></label>
   <label className="form-field"><span>Installation Labor / Door</span><input type="number" min={550} max={1000} value={labor} onChange={e=>setLabor(Math.max(550,Math.min(1000,Number(e.target.value)||550)))}/></label>
   <label className="form-field"><span>Old Openers to Remove</span><input type="number" min={0} value={oldOpeners} onChange={e=>setOldOpeners(Math.max(0,Math.floor(Number(e.target.value)||0)))}/></label>
   <label className="form-field"><span>Door Disposal</span><input type="checkbox" checked={dispose} onChange={e=>setDispose(e.target.checked)}/></label>
  </div>}
  {detail&&<div className="card" style={{marginTop:16}}><h3>Field Measurements & Notes</h3><p className="text-muted">Only verified configurations receive automatic pricing. Custom dimensions require Owner review.</p><div className="form-grid"><label className="form-field"><span>Measured Width (ft)</span><input value={measuredWidth} onChange={e=>setMeasuredWidth(e.target.value)} type="number" step=".25" placeholder="Optional"/></label><label className="form-field"><span>Measured Height (ft)</span><input value={measuredHeight} onChange={e=>setMeasuredHeight(e.target.value)} type="number" step=".25" placeholder="Optional"/></label><label className="form-field"><span>Track / Lift</span><select value={lift} onChange={e=>setLift(e.target.value)}>{["Not confirmed","Standard Lift","Low Headroom","High Lift","Vertical Lift"].map(v=><option key={v}>{v}</option>)}</select></label><label className="form-field"><span>Spring System</span><select value={spring} onChange={e=>setSpring(e.target.value)}>{["Not confirmed","Torsion","Extension"].map(v=><option key={v}>{v}</option>)}</select></label></div><label className="form-field"><span>Technician Notes / Track / Spring / Headroom</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></label></div>}
  <div className="card" style={{marginTop:16}}><h3>Estimate</h3>{ready?<><p>Door materials: {formatCurrency(doorPrice*quantity)}</p>{openerModel&&<p>Opener: {formatCurrency(openerPrice)}</p>}<p>Labor: {formatCurrency(breakdown.laborTotal)} | Disposal: {formatCurrency(breakdown.doorDisposalTotal+breakdown.openerDisposalTotal)}</p><p>Estimated tax: {formatCurrency(breakdown.tax)}</p><h2>{formatCurrency(breakdown.total)}</h2></>:<p className="alert alert-warning">{measurementConflict?"Field measurements differ from the selected catalog size. Owner review required.":"Select an exact approved configuration to receive a final price. Otherwise request Owner pricing."}</p>}
  <div className="form-grid"><label className="form-field"><span>Customer Name</span><input value={customer} onChange={e=>setCustomer(e.target.value)}/></label><label className="form-field"><span>Job Reference</span><input value={job} onChange={e=>setJob(e.target.value)}/></label></div>
  <div className="flex gap-2" style={{flexWrap:"wrap"}}><button className="btn btn-primary" disabled={!ready} onClick={save}>{saving?"Saving...":"Save Estimate"}</button><button className="btn btn-outline" disabled={!ready} onClick={copy}>Copy for ServiceTitan</button><button className="btn btn-outline" disabled={!ready} onClick={()=>window.print()}>Print / PDF</button></div>{message&&<p className="alert alert-success">{message}</p>}</div></div>
 </div>;
}
