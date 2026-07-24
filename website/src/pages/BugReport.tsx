import React, { useState } from 'react';
import { Bug, Info } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';

export default function BugReport() {
  const { user } = useAuthStore();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please describe the bug before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Gather diagnostic info
      const deviceInfo = navigator.userAgent;
      const userEmail = user?.email || 'Unknown User';
      
      const emailBody = `Bug Description:\n${description}\n\n---\nDiagnostic Info:\nUser: ${userEmail}\nDevice: ${deviceInfo}\nDate: ${new Date().toLocaleString()}`;

      const targetEmail = 'donald.colin@kalvium.com';
      const subject = encodeURIComponent('Kalvium Outreach Website - Bug Report');
      const body = encodeURIComponent(emailBody);
      
      const mailtoUrl = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
      
      window.location.href = mailtoUrl;
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-gray-900 animate-in fade-in duration-700">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Report a Bug</h1>
            <p className="text-slate-500 text-xs mt-0.5">Let us know if something isn't working right</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 flex flex-col items-center bg-gray-50/30">
        <div className="max-w-2xl w-full flex flex-col bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          
          <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex items-start gap-3 w-full mb-8">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800 leading-relaxed">
              When you click submit, your default email app will open so you can attach screenshots if needed!
              If you have any issues that can't be sent via email, please GChat me at <span className="font-semibold text-slate-700">donald.colin@kalvium.com</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide text-slate-700 ml-1">What went wrong?</label>
              <textarea
                className="w-full min-h-[200px] resize-y p-4 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent bg-slate-50/50"
                placeholder="e.g. The map wasn't loading when I changed the associate..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || !description.trim()}
              className={`w-full h-12 rounded-xl text-base font-semibold transition-all ${
                description.trim() ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}
            >
              Send Bug Report
            </Button>
          </form>
          
          <div className="mt-12 text-center opacity-40">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Made with ❤️ by Donald Colin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
