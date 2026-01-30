import { NextResponse } from 'next/server';

// Helper function to determine rating from value
function getRating(value: number): string {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 45) return 'Fear';
  if (value <= 55) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
}

export async function GET() {
  try {
    // Using Alternative.me Crypto Fear and Greed Index API
    // This API is more bot-friendly and doesn't require authentication
    const response = await fetch('https://api.alternative.me/fng/?limit=30', {
      next: { revalidate: 3600 }, // Cache for 1 hour
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Fear and Greed Index data');
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No data received from API');
    }

    // Current value (most recent)
    const current = data.data[0];
    const currentValue = parseInt(current.value);
    
    // Previous day value
    const previousClose = data.data[1] ? parseInt(data.data[1].value) : currentValue;
    
    // Get historical data (reverse to get chronological order)
    const historical = data.data.reverse().map((item: any) => ({
      date: new Date(parseInt(item.timestamp) * 1000).toISOString().split('T')[0],
      value: parseInt(item.value),
      rating: item.value_classification || getRating(parseInt(item.value))
    }));

    return NextResponse.json({
      current: {
        value: currentValue,
        rating: current.value_classification || getRating(currentValue),
        timestamp: parseInt(current.timestamp) * 1000
      },
      previousClose: previousClose,
      historical: historical,
      source: 'Alternative.me Crypto Fear & Greed Index'
    });

  } catch (error) {
    console.error('Error fetching Fear and Greed Index:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Fear and Greed Index' },
      { status: 500 }
    );
  }
}

