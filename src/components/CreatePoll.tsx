import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function CreatePoll() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = () => {
    setOptions([...options, '']);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const createPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      // Create the poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert([
          { title, created_by: user.id, is_active: true }
        ])
        .select()
        .single();

      if (pollError) throw pollError;

      // Create the options
      const optionsToInsert = options
        .filter(opt => opt.trim() !== '')
        .map(text => ({
          poll_id: poll.id,
          text
        }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      // Redirect to the new poll
      router.push(`/poll/${poll.id}`);
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Create a New Poll</h2>
      <form onSubmit={createPoll} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Poll Question
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              placeholder="What's your favorite programming language?"
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Options</label>
          {options.map((option, index) => (
            <input
              key={index}
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              placeholder={`Option ${index + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addOption}
          className="text-blue-600 hover:text-blue-800"
        >
          + Add Option
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Poll'}
        </button>
      </form>
    </div>
  );
}
