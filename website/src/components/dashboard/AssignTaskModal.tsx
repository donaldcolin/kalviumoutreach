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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl border border-gray-100 w-full max-w-md p-8 animate-in zoom-in-95 duration-300">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Assign Task</h2>
        <p className="text-sm font-medium text-gray-500 mb-8">Assigning to <span className="text-gray-900 font-bold">{selectedAssociate.name}</span></p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">School Name</label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
              placeholder="e.g. XYZ Public School"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Task Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTaskType('follow-up')}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                  taskType === 'follow-up' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Follow-up
              </button>
              <button
                type="button"
                onClick={() => setTaskType('seminar')}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                  taskType === 'seminar' 
                    ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Seminar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Date</label>
            <Popover>
              <PopoverTrigger
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-gray-900 hover:bg-gray-100 transition-colors"
              >
                <span className={`font-medium ${selectedDate ? 'text-gray-900' : 'text-gray-500'}`}>
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </span>
                <CalendarIcon className="h-4 w-4 text-gray-500" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60] rounded-xl shadow-xl border border-gray-100" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  className="bg-white rounded-xl"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-black rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isSubmitting ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
