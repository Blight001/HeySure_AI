/**
 * HeySure AI - 通知页面
 * 负责展示应用通知列表，支持标记全部已读功能
 */
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">通知</h1>
        <Button variant="outline" size="sm">
          <CheckCheck className="w-4 h-4 mr-2" />
          全部已读
        </Button>
      </div>
      
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="bg-muted rounded-full p-4 mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">暂无通知</p>
        </CardContent>
      </Card>
    </div>
  );
}

