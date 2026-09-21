"use client";

import { ArrowLeft, ArrowRight, Check, Clock3, Compass, MapPin, Sparkles, Ticket, Users } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";

type ScheduleItem = { time: string; activity: string; reason: string; duration: string; estimatedCost: string };
type Plan = { title: string; summary: string; schedule: ScheduleItem[]; totalEstimatedCost: string; tips: string[] };
const times = [
  ...Array.from({ length: 19 }, (_, index) => {
    const hour = index + 6;
    const displayHour = hour <= 12 ? hour : hour === 24 ? 12 : hour - 12;
    return { label: `${hour < 12 ? "오전" : "오후"} ${displayHour}시`, value: hour === 24 ? "00:00" : `${String(hour).padStart(2, "0")}:00` };
  }),
  ...Array.from({ length: 5 }, (_, index) => ({ label: `오전 ${index + 1}시`, value: `0${index + 1}:00` })),
];
const budgets = ["3만 원 이하", "5만 원 이하", "10만 원 이하", "제한 없음"];
const companions = ["혼자", "친구", "연인", "가족"];
const interests = ["카페", "맛집", "전시", "산책", "쇼핑", "액티비티"];

export default function Home() {
  const [area, setArea] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("20:00");
  const [budget, setBudget] = useState("5만 원 이하");
  const [companion, setCompanion] = useState("친구");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["카페", "맛집"]);
  const [request, setRequest] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const toggleInterest = (interest: string) => setSelectedInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!area.trim()) return;
    setError(""); setIsLoading(true);
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ area: area.trim(), startTime, endTime, budget, companion, interests: selectedInterests, additionalRequest: request.trim() }) });
      const data = await response.json() as Plan | { error?: string };
      if (!response.ok || !("schedule" in data)) throw new Error("error" in data ? data.error : "코스를 만들지 못했어요.");
      setPlan(data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "잠시 후 다시 시도해 주세요."); }
    finally { setIsLoading(false); }
  };
  if (plan) return <Result plan={plan} area={area} onReset={() => { setPlan(null); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} />;
  return <main className="planner-page">
    <Header />
    <section className="hero" id="top"><p className="eyebrow">ONE DAY, YOUR WAY</p><h1>오늘, 어디로 떠나볼까요?</h1><p>원하는 분위기만 알려주세요. 나만의 하루 코스를 만들어드릴게요.</p></section>
    <form className="planner-card" onSubmit={handleSubmit}>
      <section className="form-section"><div className="section-heading"><span className="step">01</span><div><h2>어디로 갈까요?</h2><p>가고 싶은 동네나 지역을 적어주세요.</p></div></div><label className="field-label" htmlFor="area">지역 <em>필수</em></label><div className="location-field"><MapPin size={19} aria-hidden="true" /><input id="area" value={area} onChange={(event) => setArea(event.target.value)} placeholder="예: 서울 성수동" required /></div></section>
      <section className="form-section bordered"><div className="section-heading"><span className="step">02</span><div><h2>언제부터 언제까지?</h2><p>여유롭게 즐길 수 있는 시간을 알려주세요.</p></div></div><div className="time-grid"><label className="field-label" htmlFor="start-time">시작 시간<select id="start-time" value={startTime} onChange={(event) => setStartTime(event.target.value)}>{times.slice(0, -1).map((time) => <option key={time.value} value={time.value}>{time.label}</option>)}</select></label><span className="time-divider" aria-hidden="true">~</span><label className="field-label" htmlFor="end-time">종료 시간<select id="end-time" value={endTime} onChange={(event) => setEndTime(event.target.value)}>{times.slice(1).map((time) => <option key={time.value} value={time.value}>{time.label}</option>)}</select></label></div></section>
      <section className="form-section bordered"><div className="section-heading compact"><span className="step">03</span><div><h2>어떤 하루를 원하세요?</h2><p>선택할수록 더 잘 맞는 코스를 추천해요.</p></div></div><FieldGroup title="예산" options={budgets} value={budget} onChange={setBudget} /><FieldGroup title="동행" options={companions} value={companion} onChange={setCompanion} icon={<Users size={16} />} /><div className="choice-group"><span className="field-label">관심사 <small>복수 선택</small></span><div className="interest-grid">{interests.map((interest) => { const isSelected = selectedInterests.includes(interest); return <button type="button" className={`chip ${isSelected ? "selected" : ""}`} onClick={() => toggleInterest(interest)} aria-pressed={isSelected} key={interest}>{isSelected && <Check size={14} />} {interest}</button>; })}</div></div></section>
      <section className="form-section bordered"><label className="field-label" htmlFor="request">추가 요청 <small>선택</small></label><textarea id="request" value={request} onChange={(event) => setRequest(event.target.value)} placeholder="예: 비 오는 날에도 가능한 실내 위주" rows={3} /></section>
      <div className="submit-area"><button className="submit-button" type="submit" disabled={!area.trim() || isLoading}><Sparkles size={19} /> {isLoading ? "AI가 코스를 만드는 중…" : "AI 코스 만들기"} {!isLoading && <ArrowRight size={18} />}</button>{error ? <p className="form-error" role="alert">{error}</p> : <p>약 10초 후, 나만의 하루가 완성돼요.</p>}</div>
    </form>
  </main>;
}

function Header() { return <header className="planner-header"><a className="brand" href="#top" aria-label="오늘의 코스 홈"><span className="brand-icon"><Compass size={20} strokeWidth={2.5} /></span><span>오늘의 코스</span></a><span className="header-note"><Sparkles size={15} /> AI가 취향을 읽어요</span></header>; }
function FieldGroup({ title, options, value, onChange, icon }: { title: string; options: string[]; value: string; onChange: (value: string) => void; icon?: ReactNode }) { return <div className="choice-group"><span className="field-label">{icon}{title}</span><div className="option-grid">{options.map((option) => <button className={`option ${value === option ? "selected" : ""}`} type="button" onClick={() => onChange(option)} aria-pressed={value === option} key={option}>{option}</button>)}</div></div>; }
function Result({ plan, area, onReset }: { plan: Plan; area: string; onReset: () => void }) {
  return <main className="planner-page result-page"><Header /><section className="result-hero"><p className="eyebrow"><Sparkles size={13} /> YOUR PERSONAL COURSE</p><h1>{plan.title}</h1><p>{plan.summary}</p><span><MapPin size={14} /> {area}</span></section><section className="result-card"><div className="result-section-head"><h2>시간대별 코스</h2><span>{plan.schedule.length}개의 순간</span></div><ol className="timeline">{plan.schedule.map((item, index) => <li key={`${item.time}-${index}`}><div className="timeline-time">{item.time}</div><div className="timeline-dot" /><article className="schedule-card"><div><h3>{item.activity}</h3><p>{item.reason}</p></div><footer><span><Clock3 size={14} /> {item.duration}</span><span><Ticket size={14} /> {item.estimatedCost}</span></footer></article></li>)}</ol><div className="total-cost"><span>예상 총비용</span><strong>{plan.totalEstimatedCost}</strong></div><div className="tips"><h2>오늘을 더 즐기는 팁</h2><ul>{plan.tips.map((tip, index) => <li key={index}><Check size={15} /> {tip}</li>)}</ul></div></section><button type="button" className="reset-button" onClick={onReset}><ArrowLeft size={17} /> 새 조건으로 다시 만들기</button></main>;
}
