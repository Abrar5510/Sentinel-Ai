import { ElevenLabsClient } from 'elevenlabs';

export class VoiceAlertService {
  private client: ElevenLabsClient;
  
  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY!
    });
  }
  
  async generateAlertAudio(
    alertType: string,
    protocolName: string,
    healthScore: number,
    riskFactors: string[]
  ): Promise<Buffer> {
    let message = `Alert: ${protocolName} health score is ${healthScore}. `;
    if (riskFactors.length > 0) {
      message += `Risk factors: ${riskFactors.join(', ')}`;
    }
    
    const audio = await this.client.generate({
      voice: process.env.ELEVENLABS_VOICE_ID!,
      text: message,
      model_id: 'eleven_turbo_v2'
    });
    
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }
}

export const voiceService = new VoiceAlertService();