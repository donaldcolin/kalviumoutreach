export interface WalkInFormState {
  typeOfWalkIn: string;
  walkInDateTime: Date | null;
  walkInStatus: string;
  followUpDate: Date | null;
  notes: string;
  reasonForRefusal: string;
  statusFDI: string;
  strength12th: string;
  schoolFees: string;
  boardOfSchool: string;
  proposalSentToFD: string;
  picName: string;
  picDesignation: string;
  picPhone: string;
  picEmail: string;
  picAppointmentDateTime: Date | null;
  statusPCI: string;
  proposalSentToPIC: string;
  princiAppointmentDateTime: Date | null;
  seminarAppointmentDateTime: Date | null;
  statusPI: string;
  principalName: string;
  principalPhone: string;
  principalEmail: string;
  proposalSentToPrincipal: string;
}

export function buildWalkInActivityData(form: WalkInFormState) {
  const formatDateTime = (d: Date | null) => (d ? d.toISOString().replace('T', ' ').split('.')[0] : '');

  // LSQ activity fields
  const activityData = [
    { SchemaName: 'mx_Custom_2', Value: 'Walk-in Activity' },
    { SchemaName: 'mx_Custom_36', Value: form.typeOfWalkIn },
    { SchemaName: 'mx_Custom_1', Value: formatDateTime(form.walkInDateTime) },
    { SchemaName: 'mx_Custom_4', Value: form.walkInStatus },
    { SchemaName: 'mx_Custom_6', Value: formatDateTime(form.followUpDate) },
    { SchemaName: 'ActivityEvent_Note', Value: form.notes },
  ];

  if (form.walkInStatus === 'Refused Entry - RE') {
    activityData.push({ SchemaName: 'mx_Custom_10', Value: form.reasonForRefusal });
  }

  if (form.walkInStatus === 'Front Desk Interaction - FDI') {
    activityData.push(
      { SchemaName: 'mx_Custom_7', Value: form.statusFDI },
      { SchemaName: 'mx_Custom_35', Value: form.strength12th },
      { SchemaName: 'mx_Custom_33', Value: form.schoolFees },
      { SchemaName: 'mx_Custom_37', Value: form.boardOfSchool }
    );
    if (form.statusFDI === 'Asking to sent proposal') activityData.push({ SchemaName: 'mx_Custom_12', Value: form.proposalSentToFD });
    if (form.statusFDI === 'Fixed meeting with PIC') {
      activityData.push(
        { SchemaName: 'mx_Custom_13', Value: form.picName },
        { SchemaName: 'mx_Custom_16', Value: form.picDesignation },
        { SchemaName: 'mx_Custom_15', Value: form.picPhone },
        { SchemaName: 'mx_Custom_17', Value: formatDateTime(form.picAppointmentDateTime) }
      );
    }
  }

  if (form.walkInStatus === 'PIC Interaction - PCI') {
    activityData.push({ SchemaName: 'mx_Custom_8', Value: form.statusPCI });
    if (form.statusPCI === 'Asking to sent proposal') activityData.push({ SchemaName: 'mx_Custom_25', Value: form.proposalSentToPIC });
    if (form.statusPCI === 'Appointment fixed with Principal') activityData.push({ SchemaName: 'mx_Custom_27', Value: formatDateTime(form.princiAppointmentDateTime) });
    if (form.statusPCI === 'Appointment fixed for Seminar') activityData.push({ SchemaName: 'mx_Custom_18', Value: formatDateTime(form.seminarAppointmentDateTime) });
  }

  if (form.walkInStatus === 'Principal Interaction - PI') {
    activityData.push(
      { SchemaName: 'mx_Custom_9', Value: form.statusPI },
      { SchemaName: 'mx_Custom_21', Value: form.principalName },
      { SchemaName: 'mx_Custom_23', Value: form.principalPhone }
    );
    if (form.statusPI === 'Asking to sent proposal') activityData.push({ SchemaName: 'mx_Custom_26', Value: form.proposalSentToPrincipal });
    if (form.statusPI === 'Appointment fixed for Seminar') activityData.push({ SchemaName: 'mx_Custom_18', Value: formatDateTime(form.seminarAppointmentDateTime) });
  }

  const filteredData = activityData.filter((item) => item.Value && item.Value.trim() !== '');

  // Build extra data for local Firestore (timeline display)
  const extraData: Record<string, any> = {
    typeOfWalkIn: form.typeOfWalkIn,
    walkInStatus: form.walkInStatus,
    activityType: 'Walk-in Activity',
    followUpDate: form.followUpDate?.toISOString() || '',
    notes: form.notes,
  };

  if (form.walkInStatus === 'Refused Entry - RE') {
    extraData.refusedEntryReason = form.reasonForRefusal;
  }
  if (form.walkInStatus === 'Front Desk Interaction - FDI') {
    extraData.statusFrontDesk = form.statusFDI;
    extraData.studentStrength = form.strength12th;
    extraData.schoolFees = form.schoolFees;
    extraData.boardOfSchool = form.boardOfSchool;
    if (form.statusFDI === 'Asking to sent proposal') extraData.proposalSentToSchool = form.proposalSentToFD;
    if (form.statusFDI === 'Fixed meeting with PIC') {
      extraData.picName = form.picName;
      extraData.picDesignation = form.picDesignation;
      extraData.picPhone = form.picPhone;
      extraData.picEmail = form.picEmail;
      extraData.picAppointmentDate = form.picAppointmentDateTime?.toISOString() || '';
    }
  }
  if (form.walkInStatus === 'PIC Interaction - PCI') {
    extraData.statusPIC = form.statusPCI;
    if (form.statusPCI === 'Asking to sent proposal') extraData.proposalSentToPIC = form.proposalSentToPIC;
    if (form.statusPCI === 'Appointment fixed with Principal') extraData.principalAppointmentDate = form.princiAppointmentDateTime?.toISOString() || '';
    if (form.statusPCI === 'Appointment fixed for Seminar') extraData.seminarAppointmentDate = form.seminarAppointmentDateTime?.toISOString() || '';
  }
  if (form.walkInStatus === 'Principal Interaction - PI') {
    extraData.statusPrincipal = form.statusPI;
    extraData.principalName = form.principalName;
    extraData.principalPhone = form.principalPhone;
    if (form.statusPI === 'Asking to sent proposal') extraData.proposalSentToPrincipal = form.proposalSentToPrincipal;
    if (form.statusPI === 'Appointment fixed for Seminar') extraData.seminarAppointmentDate = form.seminarAppointmentDateTime?.toISOString() || '';
  }

  return { filteredData, extraData };
}
