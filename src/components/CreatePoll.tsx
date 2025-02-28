'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2, Calendar } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ImageUpload } from "@/components/ui/image-upload"

export default function CreatePoll() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<Array<{ text: string; image_url?: string }>>([{ text: '' }, { text: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requireAuth, setRequireAuth] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [date, setDate] = useState<Date>();
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

  const updateOptionImage = (index: number, url: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], image_url: url };
    setOptions(newOptions);
  };

  const removeOptionImage = (index: number) => {
    const newOptions = [...options];
    delete newOptions[index].image_url;
    setOptions(newOptions);
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
        show_results: showResults,
        end_date: date ? date.toISOString() : null,
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
          text: option.text,
          image_url: option.image_url || null
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
    <Card>
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

          <div className="flex items-center justify-between space-x-2">
            <Label>Show Results Before Voting</Label>
            <Switch
              checked={showResults}
              onCheckedChange={setShowResults}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <Label>End Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(index, e.target.value)}
                        required
                        placeholder={`Option ${index + 1}`}
                      />
                    </div>
                    <ImageUpload
                      onImageUploaded={(url) => updateOptionImage(index, url)}
                      onImageRemoved={() => removeOptionImage(index)}
                      currentImage={option.image_url}
                    />
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
            className="w-full border-dashed hover:border-primary/50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
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
