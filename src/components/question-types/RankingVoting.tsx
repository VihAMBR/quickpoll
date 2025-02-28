'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useFingerprint } from '@/lib/fingerprint';
import { Option } from '@/types/database.types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

interface RankingVotingProps {
  pollId: string;
  options: Option[];
  userId?: string;
  onVoteSubmitted?: () => void;
}

export function RankingVoting({ pollId, options, userId, onVoteSubmitted }: RankingVotingProps) {
  const [items, setItems] = useState(options);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { deviceId } = useFingerprint();

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const rankings = items.map((item, index) => ({
        poll_id: pollId,
        option_id: item.id,
        rank: index + 1,
        created_by: userId,
        device_id: deviceId
      }));

      const { error } = await supabase
        .from('ranking_answers')
        .insert(rankings);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your rankings have been submitted.',
      });

      onVoteSubmitted?.();
    } catch (error) {
      console.error('Error submitting rankings:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit rankings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="rankings">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center gap-2 p-3 bg-card rounded-lg border"
                    >
                      <div {...provided.dragHandleProps}>
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="font-medium mr-2">{index + 1}.</span>
                      <div className="flex-1">
                        {item.text}
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.text}
                            className="mt-2 w-20 h-20 object-cover rounded"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full"
      >
        Submit Rankings
      </Button>
    </div>
  );
}
