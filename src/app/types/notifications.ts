export interface NotificationPayload {
  taskId: string;
  taskTitle: string;
  taskDescription: string | null;
  boardName: string;
  columnName: string;
  completedAt: string;
  userEmail: string;
}

export interface EmailTemplate {
  subject: string;
  text: string;
}

export function createTaskCompletedEmail(payload: NotificationPayload): EmailTemplate {
  return {
    subject: `Task completed: ${payload.taskTitle}`,
    text: `
Task "${payload.taskTitle}" has been moved to Finished.

Board: ${payload.boardName}
Column: ${payload.columnName}
Completed at: ${payload.completedAt}

${payload.taskDescription ? `Description:\n${payload.taskDescription}` : ''}

---
Kanban Board Notification
    `.trim(),
  };
}