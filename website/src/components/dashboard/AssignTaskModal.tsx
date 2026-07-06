import React, { useState } from 'react';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssociate: { id: string; name: string } | null;
}

export function AssignTaskModal({ isOpen, onClose, selectedAssociate }: AssignTaskModalProps) {
  const [schoolName, setSchoolName] = useState('');
  const [taskType, setTaskType] = useState<'seminar' | 'follow-up'>('follow-up');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !selectedAssociate) return;

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, 'appointments'), {
        executiveId: selectedAssociate.id,
        schoolName: schoolName.trim(),
        type: taskType,
        date: selectedDate.toISOString(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      setSchoolName('');
      setTaskType('follow-up');
      setSelectedDate(new Date());
      onClose();
    } catch (error) {
      console.error('Failed to assign task:', error);
      alert('Failed to assign task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !selectedAssociate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-1">Assign Task</h2>
        <p className="text-sm text-zinc-500 mb-6">Assigning to {selectedAssociate.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">School Name</label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="e.g. XYZ Public School"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Task Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTaskType('follow-up')}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  taskType === 'follow-up' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                Follow-up
              </button>
              <button
                type="button"
                onClick={() => setTaskType('seminar')}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  taskType === 'seminar' 
                    ? 'bg-purple-50 border-purple-500 text-purple-700' 
                    : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                Seminar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Date</label>
            <Popover>
              <PopoverTrigger
                className="w-full flex items-center justify-between px-3 py-2 border border-zinc-200 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-zinc-900 hover:bg-zinc-50 transition-colors"
              >
                <span className={selectedDate ? 'text-zinc-900' : 'text-zinc-500'}>
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </span>
                <CalendarIcon className="h-4 w-4 text-zinc-500" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
