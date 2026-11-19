// Match the entire clause, using the same SS14 row in both locales. Only the
// magnitude comes from the player. The receipt identifies the wording/model.
const indexes=new WeakMap();
const clean=text=>text.normalize('NFKC').trim().replace(/\s+/gu,' ').replace(/\s+%/gu,'%').replaceAll('−','-');
const verified=p=>p?.season==='SS14'&&p.sourceSeasonEvidence?.verificationComplete&&p.sourceSeasonEvidence.actualSeason===14;
function scalar(text) {
  const value=clean(text);
  const match=/^([+-]?\d+(?:\.\d+)?)(%?) ([\p{L}][\p{L} ]*)$/u.exec(value);
  const end=!match&&/^([\p{L}][\p{L} ]*) ([+-]?\d+(?:\.\d+)?)(%?)$/u.exec(value);
  if(!match&&!end)return null;
  const [amount,unit,label]=match?match.slice(1):[end[2],end[3],end[1]];
  const number=Number(amount);
  return Number.isFinite(number)&&Math.abs(number)<=Number.MAX_SAFE_INTEGER?{key:label.toLowerCase()+unit,number,label,unit}:null;
}
function templates(data,parse) {
  if(indexes.has(data))return indexes.get(data);
  const index=new Map();
  for(const page of Object.values(data.pages)) {
    if(page.category!=='talents'||page.locale!=='en'||!verified(page))continue;
    const ko=data.pages[page.sourceUrl.replace('/en/','/ko/')];
    if(!verified(ko))continue;
    const paired=new Map(ko.parsed.entries.map(r=>[r.section+':'+r.id,r]));
    for(const row of page.parsed.entries) {
      const key=row.section+':'+row.id;
      const lines=row.detail.split('\n'),translated=paired.get(key)?.detail?.split('\n');
      if(lines.length!==translated?.length)continue;
      for(const [i,line] of lines.entries()) {
        const en=scalar(line),kr=scalar(translated[i]);
        if(!en||!kr||en.number!==kr.number||en.unit!==kr.unit||!/[가-힣]/u.test(kr.label)||/\p{Script=Han}/u.test(kr.label))continue;
        const parsed=parse(line),effects=parsed.effects;
        if(!effects.length||parsed.blockers.length||parsed.conditions.length||parsed.inactive.length||
          effects.some(e=>e.value!==en.number||!['add','add_percent','more'].includes(e.operation)))continue;
        const signature=JSON.stringify(effects.map(e=>[e.stat,e.operation,e.unit]));
        const template={signature,effects,english:line,korean:translated[i],receipt:{season:'SS14',sourceUrl:page.sourceUrl,sourcePageSha256:page.sourcePageSha256,
          sourceRecordKey:key+':'+i,authorityScope:'preview-site-deployment'}};
        for(const alias of [en.key,kr.key]){
          if(!index.has(alias))index.set(alias,template);
          else if(index.get(alias)?.signature!==signature)index.set(alias,null);
        }
      }
    }
  }
  indexes.set(data,index);
  return index;
}
export function seasonCustomUnitOptions(data, parse) {
  const index=templates(data,parse);
  const candidates=new Map();
  for(const template of new Set(index.values())) {
    if(!template)continue;
    const input=scalar(template.korean);
    if(input.number<=0||index.get(input.key)!==template)continue;
    const signature=JSON.stringify(template.effects.map(e=>[e.stat,e.operation,e.unit]).sort());
    if(!candidates.has(signature))candidates.set(signature,template.korean.replace(/[+−-]?\d+(?:\.\d+)?/u,'+1'));
  }
  return [...candidates.values()].sort((a,b)=>a.localeCompare(b,'ko'));
}
const hiddenLine=n=>'〔한국어 원문 미제공 '+n+'〕';
export function customOptionEditorText(value) {
  return (value??'').split(/\r?\n/u).map((line,i)=>/\p{Script=Han}/u.test(line)?hiddenLine(i+1):line).join('\n');
}
export function restoreCustomOptionText(text,old) {
  const hidden=new Map((old??'').split(/\r?\n/u).flatMap((line,i)=>/\p{Script=Han}/u.test(line)?[[hiddenLine(i+1),line]]:[]));
  return text.split(/\r?\n/u).map(line=>hidden.get(line)??line).join('\n');
}
export function seasonCustomRows(build,data,parse) {
  if(!build?.customAffixes?.trim())return [];
  const index=templates(data,parse);
  return build.customAffixes.split(/\r?\n/u).flatMap((line,i)=>{
    if(!line.trim())return [];
    const input=scalar(line),template=input&&index.get(input.key);
    const path='customAffixes.'+i,group='custom',name='사용자 옵션 '+(i+1);
    const signed=input?(input.number>=0?'+':'')+input.number:'';
    const withAmount=source=>source.replace(/[+−-]?\d+(?:\.\d+)?/u,signed);
    const detail=template?withAmount(template.korean):/\p{Script=Han}/u.test(line)?'한국어 원문 미제공':line;
    const receipt=template?.receipt??null;
    const effects=(template?.effects??[]).map(e=>({...e,value:input.number,sourceText:withAmount(template.english),detail,path,group,receipt}));
    return [{path,group,name,detail,receipt,selectionCount:1,conditionControls:[],inactive:[],mechanics:[],heroControls:[],effects,
      blockers:template?[]:[{reason:'SS14에서 해석할 수 없는 옵션입니다. 입력한 문구를 확인하세요.'}],status:template?'mapped':'partial'}];
  });
}
