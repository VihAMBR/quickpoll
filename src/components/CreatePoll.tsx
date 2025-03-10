'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

export default function CreatePoll() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<Array<{ text: string }>>([{ text: '' }, { text: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requireAuth, setRequireAuth] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [allowMultipleChoices, setAllowMultipleChoices] = useState(false);
  const [maxChoices, setMaxChoices] = useState(1);

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase) {
        console.error('Supabase client not available');
        router.push('/');
        return;
      }

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) {
          router.push('/');
          return;
        }
        setUserId(user.id);
      } catch (error) {
        console.error('Error checking user:', error);
        router.push('/');
      }
    };
    checkUser();
  }, [router]);

  const addOption = () => {
    setOptions([...options, { text: '' }]);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], text: value };
    setOptions(newOptions);
  };

  const deleteOption = (index: number) => {
    if (options.length <= 2) {
      toast({
        title: "Cannot Remove",
        description: "At least two options are required for a poll",
        variant: "destructive"
      });
      return;
    }
    
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
    
    // Adjust maxChoices if needed
    if (allowMultipleChoices && maxChoices > newOptions.length) {
      setMaxChoices(newOptions.length);
    }
  };

  const createPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!userId) {
        toast({
          title: 'Error',
          description: 'You must be signed in to create a poll',
          variant: 'destructive'
        });
        return;
      }

      if (!supabase) throw new Error('Supabase client not available');

      // Create the poll with only multiple choice options
      const pollData = { 
        title, 
        description: description || null,
        user_id: userId,
        is_public: true,
        require_auth: requireAuth,
        show_results: true, // Always show results after voting
        question_type: 'multiple_choice',
        allow_multiple_choices: allowMultipleChoices,
        max_choices: maxChoices
      };
      
      console.log('Poll data being sent:', pollData);
        
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert(pollData)
        .select()
        .single();

      if (pollError) {
        console.error('Poll creation error details:', {
          message: pollError.message,
          details: pollError.details,
          hint: pollError.hint,
          code: pollError.code
        });
        throw pollError;
      }

      console.log('Poll created successfully:', poll);

      // Create the options
      const optionsData = options
        .filter(option => option.text.trim())
        .map(option => ({
          poll_id: poll.id,
          text: option.text
        }));

      console.log('Options data:', optionsData);

      if (optionsData.length > 0) {
        const { error: optionsError } = await supabase
          .from('poll_options')
          .insert(optionsData);

        if (optionsError) {
          console.error('Options creation error:', optionsError);
          throw optionsError;
        }
      }

      toast({
        title: 'Success!',
        description: 'Your poll has been created.',
      });

      router.push(`/poll/${poll.id}`);
    } catch (error: any) {
      console.error('Error creating poll:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create poll. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-border shadow-sm">
      <form onSubmit={createPoll}>
        <CardHeader>
          <CardTitle>Create a New Poll</CardTitle>
          <CardDescription>
            Create a multiple choice poll and share it with others to collect votes.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="What's your favorite programming language?"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context about your poll"
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label>Require Authentication</Label>
            <Switch
              checked={requireAuth}
              onCheckedChange={setRequireAuth}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label>Allow Multiple Choices</Label>
              <Switch
                checked={allowMultipleChoices}
                onCheckedChange={(checked) => {
                  setAllowMultipleChoices(checked);
                  if (!checked) setMaxChoices(1);
                }}
              />
            </div>

            {allowMultipleChoices && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Maximum Choices</Label>
                  <span className="text-sm text-muted-foreground">{maxChoices}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max={options.length}
                  value={maxChoices}
                  onChange={(e) => setMaxChoices(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-4">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(index, e.target.value)}
                        required
                        placeholder={`Option ${index + 1}`}
                      />
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => deleteOption(index)}
                      className="border-red-200 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      title="Delete option"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={addOption}
            variant="outline"
            size="sm"
            className="w-full border-dashed border-blue-200 hover:bg-blue-50 hover:border-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
          >
            <Plus className="h-4 w-4 mr-2 text-blue-600" />
            Add Option
          </Button>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-md hover:shadow-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Poll'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
