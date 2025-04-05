"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TabsDemo() {
  return (
    <div className="w-full max-w-4xl">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="add-entry">Add Entry</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>View your knowledge hub statistics and recent activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <h3 className="text-lg font-medium">Recent Activity</h3>
                <p className="text-sm text-muted-foreground">Last updated 15 minutes ago</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">New Entries</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">New Connections</p>
                  <p className="text-2xl font-bold">87</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="add-entry">
          <Card>
            <CardHeader>
              <CardTitle>Add Knowledge Entry</CardTitle>
              <CardDescription>Add a new entry to your knowledge base</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Title</label>
                  <Input id="title" placeholder="Enter knowledge entry title" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">Category</label>
                  <Input id="category" placeholder="Category or tags" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="content" className="text-sm font-medium">Content</label>
                  <div className="rounded-md border">
                    <textarea 
                      id="content" 
                      placeholder="Enter your knowledge content here..." 
                      className="w-full min-h-[150px] p-2 bg-transparent resize-none focus:outline-none"
                    ></textarea>
                  </div>
                </div>
                <Button className="w-full">Add Entry</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Manage your knowledge hub preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Automated Connections</p>
                    <p className="text-sm text-muted-foreground">Allow AI to create connections automatically</p>
                  </div>
                  <div className="h-6 w-12 cursor-pointer rounded-full bg-primary flex items-center px-1" role="checkbox" aria-checked="true">
                    <div className="h-4 w-4 rounded-full bg-primary-foreground transform translate-x-6"></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Digest</p>
                    <p className="text-sm text-muted-foreground">Receive a daily summary of new knowledge</p>
                  </div>
                  <div className="h-6 w-12 cursor-pointer rounded-full bg-primary/25 flex items-center px-1" role="checkbox" aria-checked="false">
                    <div className="h-4 w-4 rounded-full bg-muted"></div>
                  </div>
                </div>
              </div>
              
              <Button className="w-full">Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
