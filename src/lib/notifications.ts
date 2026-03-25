import { env } from '../config/env';
import { Activity } from './data';

export async function sendTelegramNotification(
    activity: Partial<Activity> & { groupName: string }
) {
    try {
        const response = await fetch(`${env.NEXT_PUBLIC_BOT_SERVER_URL}/api/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': env.NEXT_PUBLIC_NOTIFY_API_KEY,
            },
            body: JSON.stringify({
                groupName: activity.groupName,
                action: activity.action,
                employeeName: activity.employeeName,
                description: activity.description,
                source: activity.source || 'UI',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.log('❌ Failed to send Telegram notification:', errorData);
            return { success: false, error: errorData.error || 'Unknown error' };
        }

        return await response.json();
    } catch (error: any) {
        console.log('❌ Error in sendTelegramNotification:', error.message);
        return { success: false, error: error.message };
    }
}
