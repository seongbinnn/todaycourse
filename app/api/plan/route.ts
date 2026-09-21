import { NextResponse } from "next/server";

export const runtime = "nodejs";

const responseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    schedule: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          time: { type: "STRING" },
          activity: { type: "STRING" },
          reason: { type: "STRING" },
          duration: { type: "STRING" },
          estimatedCost: { type: "STRING" },
        },
        required: ["time", "activity", "reason", "duration", "estimatedCost"],
      },
    },
    totalEstimatedCost: { type: "STRING" },
    tips: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["title", "summary", "schedule", "totalEstimatedCost", "tips"],
};

type PlannerInput = {
  area?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  budget?: unknown;
  companion?: unknown;
  interests?: unknown;
  additionalRequest?: unknown;
};

const systemPrompt = `당신은 한국어로 답하는 하루 코스 플래너입니다.
사용자가 제공한 지역, 시간, 예산, 동행, 관심사를 바탕으로 현실적이고 이동이 효율적인 당일 코스를 제안하세요.
반드시 사용자의 시작·종료 시간 안에서 일정을 구성하고, 이동 시간을 고려하세요. 예산은 최대한 지키세요.
실시간 영업 여부나 예약 가능 여부는 확정하지 마세요. 확신하기 어려운 특정 상호명 대신 지역과 활동 단위의 제안을 사용하세요.
반드시 지정된 JSON 스키마에 맞는 유효한 JSON 객체만 반환하세요. 마크다운, 코드 펜스, 설명 문장은 절대 포함하지 마세요.`;

function isPlannerInput(value: PlannerInput): value is Required<Pick<PlannerInput, "area" | "startTime" | "endTime" | "budget" | "companion" | "interests">> & PlannerInput {
  return typeof value.area === "string" && value.area.trim().length > 0
    && typeof value.startTime === "string" && typeof value.endTime === "string"
    && typeof value.budget === "string" && typeof value.companion === "string"
    && Array.isArray(value.interests) && value.interests.every((interest) => typeof interest === "string");
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY가 설정되지 않았어요. .env.local 파일을 확인해 주세요." }, { status: 500 });
  }

  let input: PlannerInput;
  try {
    input = await request.json() as PlannerInput;
  } catch {
    return NextResponse.json({ error: "입력 정보를 읽지 못했어요." }, { status: 400 });
  }

  if (!isPlannerInput(input)) {
    return NextResponse.json({ error: "필수 입력값이 올바르지 않아요." }, { status: 400 });
  }

  const userPrompt = [
    "다음 조건으로 하루 코스를 만들어 주세요.",
    `지역: ${input.area.trim()}`,
    `시작 시간: ${input.startTime}`,
    `종료 시간: ${input.endTime}`,
    `예산: ${input.budget}`,
    `동행: ${input.companion}`,
    `관심사: ${input.interests.join(", ") || "없음"}`,
    `추가 요청: ${typeof input.additionalRequest === "string" && input.additionalRequest.trim() ? input.additionalRequest.trim() : "없음"}`,
  ].join("\n");

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.7 },
      }),
    });
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || "Gemini 요청에 실패했어요.");
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini가 코스 데이터를 반환하지 않았어요.");
    const plan = JSON.parse(text) as unknown;
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Gemini plan generation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "코스 생성 중 오류가 발생했어요." }, { status: 502 });
  }
}
