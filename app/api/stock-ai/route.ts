import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { message, stockData, conversationHistory } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build context from stock data
    const stockContext = stockData ? `
Current Stock Information:
- Symbol: ${stockData.symbol}
- Company: ${stockData.name}
- Current Price: $${stockData.price != null ? stockData.price.toFixed(2) : 'N/A'}
- Change: ${stockData.changePercent != null ? (stockData.changePercent >= 0 ? '+' : '') + stockData.changePercent.toFixed(2) + '%' : 'N/A'}
- Market Cap: ${formatMarketCap(stockData.marketCap)}
- P/E Ratio: ${stockData.pe || 'N/A'}
- EPS: ${stockData.eps != null ? '$' + stockData.eps.toFixed(2) : 'N/A'}
- 52 Week High: $${stockData.fiftyTwoWeekHigh != null ? stockData.fiftyTwoWeekHigh.toFixed(2) : 'N/A'}
- 52 Week Low: $${stockData.fiftyTwoWeekLow != null ? stockData.fiftyTwoWeekLow.toFixed(2) : 'N/A'}
- Volume: ${formatVolume(stockData.volume)}
- Average Volume: ${formatVolume(stockData.averageVolume)}
` : '';

    // Build messages for OpenAI
    const messages: any[] = [
      {
        role: 'system',
        content: `You are a knowledgeable financial analyst assistant helping users understand stock market data, valuations, and metrics. 

Your role is to:
- Explain stock valuations and metrics in clear, accessible language
- Answer questions about financial ratios (P/E, EPS, Market Cap, etc.)
- Provide context about stock performance and trends
- Help users understand what different metrics mean for investment decisions
- Offer balanced, educational perspectives without giving specific investment advice

Always be informative, clear, and educational. When discussing metrics, explain what they mean and why they matter. If asked for investment advice, remind users to consult with a licensed financial advisor and do their own research.

${stockContext ? `Here is the current stock data you should reference when answering questions:\n${stockContext}` : ''}

Keep responses concise but informative (2-4 paragraphs typically).`
      }
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 800,
    });

    const assistantMessage = completion.choices[0].message.content;

    return NextResponse.json({
      message: assistantMessage,
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to get AI response' },
      { status: 500 }
    );
  }
}

function formatMarketCap(num: number | null): string {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
}

function formatVolume(num: number | null): string {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toString();
}

