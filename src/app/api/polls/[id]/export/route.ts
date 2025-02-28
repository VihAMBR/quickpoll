import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { headers } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = headers();
    const pollId = params.id;

    // Get poll results
    const { data, error } = await supabase
      .rpc('export_poll_results', { poll_id: pollId });

    if (error) throw error;

    // Convert poll data to CSV
    const csvData = convertToCSV(data);

    // Create response with CSV file
    const response = new NextResponse(csvData);
    response.headers.set('Content-Type', 'text/csv');
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="poll-${pollId}-results.csv"`
    );

    return response;
  } catch (error) {
    console.error('Error exporting poll results:', error);
    return NextResponse.json(
      { error: 'Failed to export poll results' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: any): string {
  const poll = data as {
    poll_id: string;
    title: string;
    description: string;
    question_type: string;
    created_at: string;
    total_views: number;
    options: Array<{
      id: string;
      text: string;
      votes: number | Array<{ rank: number; count: number }>;
    }>;
    text_answers: Array<{
      answer: string;
      created_at: string;
    }>;
    rating_summary: {
      average: number;
      distribution: Array<{
        rating: number;
        count: number;
      }>;
    };
  };

  let csv = '';

  // Add poll information
  csv += 'Poll Information\n';
  csv += `Title,${poll.title}\n`;
  csv += `Description,${poll.description || ''}\n`;
  csv += `Type,${poll.question_type}\n`;
  csv += `Created At,${poll.created_at}\n`;
  csv += `Total Views,${poll.total_views}\n\n`;

  // Add results based on question type
  switch (poll.question_type) {
    case 'multiple_choice':
    case 'true_false':
      csv += 'Option,Votes\n';
      poll.options.forEach(option => {
        csv += `${option.text},${option.votes}\n`;
      });
      break;

    case 'ranking':
      csv += 'Option,';
      const maxRank = Math.max(...poll.options.flatMap(o => 
        (o.votes as Array<{ rank: number }>).map(v => v.rank)
      ));
      for (let i = 1; i <= maxRank; i++) {
        csv += `Rank ${i},`;
      }
      csv = csv.slice(0, -1) + '\n';

      poll.options.forEach(option => {
        csv += `${option.text},`;
        const votes = option.votes as Array<{ rank: number; count: number }>;
        for (let rank = 1; rank <= maxRank; rank++) {
          const rankVotes = votes.find(v => v.rank === rank);
          csv += `${rankVotes?.count || 0},`;
        }
        csv = csv.slice(0, -1) + '\n';
      });
      break;

    case 'short_answer':
      csv += 'Answer,Submitted At\n';
      poll.text_answers.forEach(answer => {
        csv += `${answer.answer},${answer.created_at}\n`;
      });
      break;

    case 'rating':
      csv += 'Rating Statistics\n';
      csv += `Average Rating,${poll.rating_summary.average}\n\n`;
      csv += 'Rating,Count\n';
      poll.rating_summary.distribution.forEach(dist => {
        csv += `${dist.rating},${dist.count}\n`;
      });
      break;
  }

  return csv;
}
