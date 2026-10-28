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
 const [detail,setDetail]=useState(false);const [style,setStyle]=useState("Standard");const [sizeType,setSizeType]=useState("Single");
 const [manufacturer,setManufacturer]=useState("");const [model,setModel]=useState("");const [width,setWidth]=useState("");const [height,setHeight]=useState("");
 const [color,setColor]=useState("");const [windows,setWindows]=useState("");const [openerModel,setOpenerModel]=useState("");const [openerRail,setOpenerRail]=useState("");
 const [quantity,setQuantity]=useState(1);const [labor,setLabor]=useState(650);const [discount,setDiscount]=useState(0);
 const [dispose,setDispose]=useState(true);const [oldOpeners,setOldOpeners]=useState(0);
 const [customer,setCustomer]=useState("");const [job,setJob]=useState("");const [notes,setNotes]=useState("");const [saving,setSaving]=useState(false);
 useEffect(()=>{fetchSalesPrices().then(setPrices).catch(e=>setError(e instanceof Error?e.message:"Unable to load approved prices")).finally(()=>setLoading(false))},[]);
 const doors=useMemo(()=>prices.filter(p=>p.category==="door"),[prices]);
 const openers=useMemo(()=>prices.filter(p=>p.category==="opener"),[prices]);
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
 const options:EstimateOptions={doors:[{manufacturer:manufacturer||"",model:model||"",sku:null,width_ft:Number(width)||0,height_ft:Number(height)||0,color,design:"traditional_raised_panel",panel_type:null,insulation_type:null,window_option:windows||"No Windows",quantity,custom:false,supplier_cost:null,selling_price:doorPrice,discount_percent:discount} as EstimateDoorConfig],openers:openerModel?[{brand:"LiftMaster",model:openerModel,quantity:1,supplier_cost:null,selling_price:openerPrice,discount_percent:discount} as EstimateOpenerConfig]:[],labor_per_door:labor,disposal_enabled:dispose,door_count_for_disposal:quantity,old_opener_disposal_count:oldOpeners,material_discount_percent:discount,tax_rate:0.0625,tax_enabled:true,notes:notes+(openerModel?" | Opener rail: "+rail:""),custom:detail};
 const breakdown=calculatePricing(options);
 const ready=!!exactDoor&&(!openerModel||!!exactOpener)&&!saving;
 const save=async()=>{if(!session||!ready)return;setSaving(true);setError("");try{const result=await saveEstimate(session.user_id,job,customer,"","","",options,"draft");navigate("/estimates/"+result.id)}catch(e){setError(e instanceof Error?e.message:"Unable to save estimate")}finally{setSaving(false)}};
 const select=(label:string,value:string,change:(v:string)=>void,values:string[],placeholder:string)=> <label className="form-field"><span>{label}</span><select value={value} onChange={e=>change(e.target.value)}><option value="">{placeholder}</option>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>;
 return <div className="fade-in" style={{maxWidth:950,margin:"0 auto"}}>
  <div className="card"><div className="card-header"><h2>Smart Door Quote</h2></div><p className="text-muted">Choose a door. Pricing comes from the approved sales catalog, never supplier cost.</p>
  <div className="flex gap-2 mb-4"><button className={"btn "+(!detail?"btn-primary":"btn-outline")} onClick={()=>setDetail(false)}>Quick Quote</button><button className={"btn "+(detail?"btn-primary":"btn-outline")} onClick={()=>setDetail(true)}>Detailed Quote</button></div>
  {error&&<div className="alert alert-error">{error}</div>}
  {loading?<p>Loading approved prices...</p>:<div className="form-grid">
   <label className="form-field"><span>Door Style</span><select value={style} onChange={e=>setStyle(e.target.value)}>{["Standard","Insulated","Carriage House","Modern / Glass"].map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="form-field"><span>Door Size</span><select value={sizeType} onChange={e=>setSizeType(e.target.value)}>{["Single","Double","Custom"].map(x=><option key={x}>{x}</option>)}</select></label>
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
  {detail&&<div className="card" style={{marginTop:16}}><h3>Field Measurements & Notes</h3><p className="text-muted">Only verified configurations receive automatic pricing. Custom dimensions require Owner review.</p><div className="form-grid"><label className="form-field"><span>Measured Width (ft)</span><input value={width} onChange={e=>setWidth(e.target.value)} type="number" step=".25"/></label><label className="form-field"><span>Measured Height (ft)</span><input value={height} onChange={e=>setHeight(e.target.value)} type="number" step=".25"/></label></div><label className="form-field"><span>Technician Notes / Track / Spring / Headroom</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></label></div>}
  <div className="card" style={{marginTop:16}}><h3>Estimate</h3>{exactDoor?<><p>Door materials: {formatCurrency(doorPrice*quantity)}</p>{openerModel&&<p>Opener: {formatCurrency(openerPrice)}</p>}<p>Labor: {formatCurrency(breakdown.laborTotal)} | Disposal: {formatCurrency(breakdown.doorDisposalTotal+breakdown.openerDisposalTotal)}</p><p>Estimated tax: {formatCurrency(breakdown.tax)}</p><h2>{formatCurrency(breakdown.total)}</h2></>:<p className="alert alert-warning">Select an exact approved configuration to receive a final price. Otherwise request Owner pricing.</p>}
  <div className="form-grid"><label className="form-field"><span>Customer Name</span><input value={customer} onChange={e=>setCustomer(e.target.value)}/></label><label className="form-field"><span>Job Reference</span><input value={job} onChange={e=>setJob(e.target.value)}/></label></div>
  <button className="btn btn-primary w-full" disabled={!ready} onClick={save}>{saving?"Saving...":"Save Estimate & Prepare for ServiceTitan"}</button></div></div>
 </div>;
}
