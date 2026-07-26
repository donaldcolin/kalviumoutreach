import { useState, useCallback } from 'react';
import { WalkInFormState } from '../utils/lsqMappers';

export function useWalkInForm() {
  const [form, setForm] = useState<WalkInFormState>({
    typeOfWalkIn: '',
    walkInDateTime: new Date(),
    walkInStatus: '',
    followUpDate: null,
    notes: '',
    reasonForRefusal: '',
    statusFDI: '',
    strength12th: '',
    schoolFees: '',
    boardOfSchool: '',
    proposalSentToFD: '',
    picName: '',
    picDesignation: '',
    picPhone: '',
    picEmail: '',
    picAppointmentDateTime: null,
    statusPCI: '',
    proposalSentToPIC: '',
    princiAppointmentDateTime: null,
    seminarAppointmentDateTime: null,
    statusPI: '',
    principalName: '',
    principalPhone: '',
    principalEmail: '',
    proposalSentToPrincipal: '',
  });

  const updateForm = useCallback((updates: Partial<WalkInFormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...updates };
      
      // If walkInStatus changes, reset dependent fields
      if (updates.walkInStatus && updates.walkInStatus !== prev.walkInStatus) {
        next.reasonForRefusal = '';
        next.statusFDI = '';
        next.strength12th = '';
        next.schoolFees = '';
        next.boardOfSchool = '';
        next.proposalSentToFD = '';
        next.picName = '';
        next.picDesignation = '';
        next.picPhone = '';
        next.picEmail = '';
        next.statusPCI = '';
        next.proposalSentToPIC = '';
        next.statusPI = '';
        next.principalName = '';
        next.principalPhone = '';
        next.principalEmail = '';
        next.proposalSentToPrincipal = '';
        next.picAppointmentDateTime = null;
        next.princiAppointmentDateTime = null;
        next.seminarAppointmentDateTime = null;
      }
      
      return next;
    });
  }, []);

  return { form, updateForm };
}
