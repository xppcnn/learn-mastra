# Mastra Voice（语音）专题指南

## 1. 什么是 Voice？

Voice（语音）系统提供统一的语音交互接口，包括文本转语音（TTS）、语音转文本（STT）和实时语音到语音（STS）功能。

### 核心能力
- 🗣️ **TTS（Text-to-Speech）** - 将文本转换为自然语音
- 👂 **STT（Speech-to-Text）** - 将语音转换为文本
- 🎙️ **STS（Speech-to-Speech）** - 实时双向语音交互
- 🔊 **多提供商支持** - 统一 API 访问多个语音服务

---

## 2. 支持的提供商

### 2.1 TTS 提供商

| 提供商 | 包名 | 特点 |
|--------|------|------|
| OpenAI | `@mastra/voice-openai` | 高质量、自然语调 |
| ElevenLabs | `@mastra/voice-elevenlabs` | 超逼真语音 |
| PlayAI | `@mastra/voice-playai` | 多种风格 |
| Google | `@mastra/voice-google` | 多语言支持 |
| Azure | `@mastra/voice-azure` | 企业级服务 |
| Deepgram | `@mastra/voice-deepgram` | AI 驱动 |
| Cloudflare | `@mastra/voice-cloudflare` | 边缘优化 |
| Speechify | `@mastra/voice-speechify` | 可读性优化 |
| Murf | `@mastra/voice-murf` | 工作室级品质 |
| Sarvam | `@mastra/voice-sarvam` | 印度语言专精 |

### 2.2 STT 提供商

| 提供商 | 包名 |
|--------|------|
| OpenAI | `@mastra/voice-openai` |
| Google | `@mastra/voice-google` |
| Azure | `@mastra/voice-azure` |
| Deepgram | `@mastra/voice-deepgram` |
| ElevenLabs | `@mastra/voice-elevenlabs` |
| Sarvam | `@mastra/voice-sarvam` |

### 2.3 STS 提供商（实时）

| 提供商 | 包名 |
|--------|------|
| OpenAI Realtime | `@mastra/voice-openai-realtime` |
| Google Gemini Live | `@mastra/voice-google-gemini-live` |

---

## 3. Text-to-Speech（TTS）

### 3.1 基本使用

```typescript
import { Agent } from "@mastra/core/agent";
import { OpenAIVoice } from "@mastra/voice-openai";
import { openai } from "@ai-sdk/openai";
import { playAudio } from "@mastra/node-audio";

const voiceAgent = new Agent({
  name: "Voice Agent",
  instructions: "你是一个语音助手。",
  model: openai("gpt-4o"),
  voice: new OpenAIVoice(),
});

// 生成响应
const { text } = await voiceAgent.generate("今天天气怎么样？");

// 转换为语音
const audioStream = await voiceAgent.voice.speak(text, {
  speaker: "alloy", // 可选：指定说话人
  responseFormat: "wav", // 可选：指定格式
});

// 播放音频
playAudio(audioStream);
```

### 3.2 保存音频到文件

```typescript
import { createWriteStream } from "fs";
import path from "path";

const audio = await agent.voice.speak("你好，世界！");
const filePath = path.join(process.cwd(), "output.mp3");
const writer = createWriteStream(filePath);

audio.pipe(writer);

await new Promise((resolve, reject) => {
  writer.on("finish", () => resolve());
  writer.on("error", reject);
});
```

### 3.3 各提供商配置

```typescript
// OpenAI
const voice = new OpenAIVoice({
  speechModel: {
    name: "tts-1-hd",
    apiKey: process.env.OPENAI_API_KEY,
  },
  speaker: "alloy", // alloy, echo, fable, onyx, nova, shimmer
});

// ElevenLabs
import { ElevenLabsVoice } from "@mastra/voice-elevenlabs";
const voice = new ElevenLabsVoice({
  speechModel: {
    voiceId: "your-voice-id",
    model: "eleven_multilingual_v2",
    apiKey: process.env.ELEVENLABS_API_KEY,
  },
});

// Google
import { GoogleVoice } from "@mastra/voice-google";
const voice = new GoogleVoice({
  speechModel: {
    name: "en-US-Studio-O",
    apiKey: process.env.GOOGLE_API_KEY,
    languageCode: "en-US",
    gender: "FEMALE",
  },
});

// Azure
import { AzureVoice } from "@mastra/voice-azure";
const voice = new AzureVoice({
  speechModel: {
    name: "en-US-JennyNeural",
    apiKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION,
    style: "cheerful",
  },
});
```

---

## 4. Speech-to-Text（STT）

### 4.1 基本使用

```typescript
import { Agent } from "@mastra/core/agent";
import { OpenAIVoice } from "@mastra/voice-openai";
import { createReadStream } from "fs";

const voiceAgent = new Agent({
  name: "Voice Agent",
  instructions: "你是一个语音助手。",
  model: openai("gpt-4o"),
  voice: new OpenAIVoice(),
});

// 从文件读取音频
const audioStream = createReadStream("./audio.mp3");

// 转换为文本
const transcript = await voiceAgent.voice.listen(audioStream, {
  filetype: "mp3", // 可选：指定文件类型
});

console.log(`用户说: ${transcript}`);

// 生成响应
const { text } = await voiceAgent.generate(transcript);
```

### 4.2 配置 STT 模型

```typescript
// OpenAI Whisper
const voice = new OpenAIVoice({
  listeningModel: {
    name: "whisper-1",
    apiKey: process.env.OPENAI_API_KEY,
    language: "zh", // 指定语言
  },
});

// Deepgram
import { DeepgramVoice } from "@mastra/voice-deepgram";
const voice = new DeepgramVoice({
  listeningModel: {
    name: "nova-2",
    apiKey: process.env.DEEPGRAM_API_KEY,
    format: "flac",
  },
});

// Google
const voice = new GoogleVoice({
  listeningModel: {
    name: "en-US",
    sampleRateHertz: 16000,
  },
});
```

---

## 5. Speech-to-Speech（STS）

### 5.1 概念

STS 通过持续的双向音频通信提供实时语音交互，与分离的 TTS 和 STT 操作不同，STS 维护一个持续处理双向语音的开放连接。

### 5.2 OpenAI Realtime

```typescript
import { Agent } from "@mastra/core/agent";
import { OpenAIRealtimeVoice } from "@mastra/voice-openai-realtime";
import { playAudio, getMicrophoneStream } from "@mastra/node-audio";

const agent = new Agent({
  name: "Realtime Agent",
  instructions: "你是一个具有实时语音功能的助手。",
  model: openai("gpt-4o"),
  voice: new OpenAIRealtimeVoice({
    model: "gpt-4o-mini-realtime",
    speaker: "alloy",
  }),
});

// 连接到语音服务
await agent.voice.connect();

// 监听音频响应
agent.voice.on("speaker", ({ audio }) => {
  playAudio(audio);
});

// 监听文本转录
agent.voice.on("writing", ({ text, role }) => {
  console.log(`${role}: ${text}`);
});

// 开始对话
await agent.voice.speak("有什么可以帮助你的？");

// 发送麦克风音频
const micStream = getMicrophoneStream();
await agent.voice.send(micStream);

// 完成后关闭连接
// agent.voice.close();
```

### 5.3 Google Gemini Live

```typescript
import { GeminiLiveVoice } from "@mastra/voice-google-gemini-live";

const agent = new Agent({
  name: "Gemini Live Agent",
  instructions: "你是一个具有实时语音功能的助手。",
  model: openai("gpt-4o"),
  voice: new GeminiLiveVoice({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-2.0-flash-exp",
    speaker: "Puck",
    debug: true,
  }),
});

// 连接（必须在使用前调用）
await agent.voice.connect();

// 监听事件
agent.voice.on("speaker", ({ audio }) => {
  playAudio(audio);
});

agent.voice.on("writing", ({ role, text }) => {
  console.log(`${role}: ${text}`);
});

// 开始对话
await agent.voice.speak("有什么可以帮助你的？");

// 发送麦克风音频
const micStream = getMicrophoneStream();
await agent.voice.send(micStream);
```

### 5.4 事件系统

```typescript
// 监听语音输出
agent.voice.on("speaker", ({ audio }) => {
  // audio 是 ReadableStream 或 Int16Array
});

// 监听文本转录
agent.voice.on("writing", ({ text, role }) => {
  console.log(`${role} 说: ${text}`);
});

// 监听错误
agent.voice.on("error", (error) => {
  console.error("语音错误:", error);
});
```

---

## 6. CompositeVoice（组合语音）

### 6.1 使用不同提供商

```typescript
import { CompositeVoice } from "@mastra/core/voice";
import { OpenAIVoice } from "@mastra/voice-openai";
import { PlayAIVoice } from "@mastra/voice-playai";

// 使用 OpenAI 进行 STT，PlayAI 进行 TTS
const voice = new CompositeVoice({
  input: new OpenAIVoice(),  // STT
  output: new PlayAIVoice(), // TTS
});

const agent = new Agent({
  name: "Composite Voice Agent",
  instructions: "你是一个语音助手。",
  model: openai("gpt-4o"),
  voice,
});
```

### 6.2 使用 AI SDK 模型

```typescript
import { CompositeVoice } from "@mastra/core/voice";
import { openai } from "@ai-sdk/openai";
import { elevenlabs } from "@ai-sdk/elevenlabs";

// 直接使用 AI SDK 模型
const voice = new CompositeVoice({
  input: openai.transcription("whisper-1"),       // STT
  output: elevenlabs.speech("eleven_turbo_v2"),   // TTS
});
```

### 6.3 混合使用

```typescript
import { CompositeVoice } from "@mastra/core/voice";
import { PlayAIVoice } from "@mastra/voice-playai";
import { groq } from "@ai-sdk/groq";

// 混合 AI SDK 和 Mastra 提供商
const voice = new CompositeVoice({
  input: groq.transcription("whisper-large-v3"),  // AI SDK STT
  output: new PlayAIVoice(),                       // Mastra TTS
});
```

---

## 7. 完整示例：语音助手

```typescript
import { Agent } from "@mastra/core/agent";
import { OpenAIVoice } from "@mastra/voice-openai";
import { openai } from "@ai-sdk/openai";
import { playAudio, getMicrophoneStream } from "@mastra/node-audio";
import { createReadStream, createWriteStream } from "fs";
import path from "path";

// 创建语音智能体
const voiceAgent = new Agent({
  name: "Voice Assistant",
  instructions: `
    你是一个友好的语音助手。
    保持回答简洁。
    如果用户说"再见"，礼貌地结束对话。
  `,
  model: openai("gpt-4o"),
  voice: new OpenAIVoice({
    speechModel: { name: "tts-1-hd" },
    listeningModel: { name: "whisper-1" },
    speaker: "nova",
  }),
});

// 辅助函数：保存音频
async function saveAudio(audio, filename) {
  const audioDir = path.join(process.cwd(), "audio");
  await fs.promises.mkdir(audioDir, { recursive: true });
  
  const filePath = path.join(audioDir, filename);
  const writer = createWriteStream(filePath);
  audio.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// 主流程
async function main() {
  // 1. 智能体打招呼
  const greeting = "你好！我是你的语音助手。有什么可以帮助你的？";
  const greetingAudio = await voiceAgent.voice.speak(greeting);
  await saveAudio(greetingAudio, "greeting.mp3");
  playAudio(greetingAudio);

  // 2. 用户输入（从文件读取）
  const userAudio = createReadStream("./user_input.mp3");
  const transcript = await voiceAgent.voice.listen(userAudio);
  console.log(`用户: ${transcript}`);

  // 3. 生成响应
  const { text } = await voiceAgent.generate(transcript);
  console.log(`助手: ${text}`);

  // 4. 转换为语音并播放
  const responseAudio = await voiceAgent.voice.speak(text);
  await saveAudio(responseAudio, "response.mp3");
  playAudio(responseAudio);
}

main().catch(console.error);
```

---

## 8. 最佳实践

1. **选择合适的提供商** - 根据质量、成本和延迟需求选择
2. **配置语言** - 确保 TTS 和 STT 使用相同的语言设置
3. **处理错误** - 实现语音服务的错误处理和重试逻辑
4. **优化延迟** - 对于实时应用，使用 STS 而不是分离的 TTS/STT
5. **管理连接** - 使用 STS 时，确保正确管理 WebSocket 连接
6. **音频格式** - 选择与应用兼容的音频格式

---

## 9. 参考资料

- [Mastra 官方文档 - Voice](https://mastra.ai/docs/voice/overview)
- [Mastra 官方文档 - TTS](https://mastra.ai/docs/voice/text-to-speech)
- [Mastra 官方文档 - STT](https://mastra.ai/docs/voice/speech-to-text)
- [Mastra 官方文档 - STS](https://mastra.ai/docs/voice/speech-to-speech)
- [Mastra GitHub 仓库](https://github.com/mastra-ai/mastra)

---

*文档生成日期：2025年12月10日*

