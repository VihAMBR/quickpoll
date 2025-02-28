'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Option, PollMetrics } from '@/types/database.types';

interface PollChartsProps {
  options: Option[];
  votes: Record<string, number>;
  totalVotes: number;
  metrics?: PollMetrics;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function PollCharts({ options, votes, totalVotes, metrics }: PollChartsProps) {
  const chartData = useMemo(() => {
    return options.map((option, index) => ({
      name: option.text,
      votes: votes[option.id] || 0,
      percentage: totalVotes > 0 ? ((votes[option.id] || 0) / totalVotes) * 100 : 0,
      color: COLORS[index % COLORS.length]
    }));
  }, [options, votes, totalVotes]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Poll Results</CardTitle>
        <CardDescription>Visualize the voting distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="bar">Bar Chart</TabsTrigger>
            <TabsTrigger value="pie">Pie Chart</TabsTrigger>
            {metrics && <TabsTrigger value="metrics">Metrics</TabsTrigger>}
          </TabsList>

          <TabsContent value="bar" className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={150} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="percentage" fill="#8884d8">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="pie" className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="votes"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          {metrics && (
            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{metrics.total_views}</CardTitle>
                    <CardDescription>Total Views</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{metrics.total_votes}</CardTitle>
                    <CardDescription>Total Votes</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{metrics.conversion_rate}%</CardTitle>
                    <CardDescription>Conversion Rate</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
