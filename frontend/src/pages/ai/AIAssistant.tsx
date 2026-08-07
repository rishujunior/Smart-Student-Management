import React, { useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Bot, Sparkles, Send, BookOpen, Compass, HelpCircle } from 'lucide-react'
import api from '../../lib/api'

export const AIAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'questions' | 'study_plan' | 'roadmap'>('chat')
  
  // Chat state
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your AI Academic Tutor powered by Google Gemini. Ask me anything about your studies, exam prep, or course concepts!' },
  ])
  const [isLoading, setIsLoading] = useState(false)

  // Question generator state
  const [qTopic, setQTopic] = useState('')
  const [qSubject, setQSubject] = useState('')
  const [generatedQuestions, setGeneratedQuestions] = useState('')

  // Study Plan state
  const [weakSubjects, setWeakSubjects] = useState('Data Structures, Operating Systems')
  const [studyPlan, setStudyPlan] = useState('')

  // Learning Roadmap state
  const [roadmapSubject, setRoadmapSubject] = useState('Machine Learning')
  const [roadmap, setRoadmap] = useState('')

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const userText = query
    setMessages((prev) => [...prev, { sender: 'user', text: userText }])
    setQuery('')
    setIsLoading(true)

    try {
      const res = await api.post('/ai/ask', { query: userText })
      setMessages((prev) => [...prev, { sender: 'ai', text: res.data.response }])
    } catch {
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Sorry, I encountered an issue processing your request.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateQuestions = async () => {
    if (!qTopic || !qSubject) return
    setIsLoading(true)
    try {
      const res = await api.post('/ai/generate-questions', {
        topic: qTopic,
        subject: qSubject,
        difficulty: 'medium',
        count: 5,
      })
      setGeneratedQuestions(res.data.questions)
    } catch {
      alert('Failed to generate questions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateStudyPlan = async () => {
    setIsLoading(true)
    try {
      const res = await api.post('/ai/study-plan', {
        student_id: 'demo',
        weak_subjects: weakSubjects.split(',').map((s) => s.trim()),
        hours_per_day: 4,
      })
      setStudyPlan(res.data.study_plan)
    } catch {
      alert('Failed to generate study plan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateRoadmap = async () => {
    setIsLoading(true)
    try {
      const res = await api.post('/ai/learning-roadmap', {
        subject: roadmapSubject,
        current_level: 'beginner',
        goal: 'industry-ready',
      })
      setRoadmap(res.data.roadmap)
    } catch {
      alert('Failed to generate roadmap')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 border border-purple-500/30 p-6 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 fill-purple-300" /> Powered by Google Gemini
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mt-2">AI Academic Suite</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Personalized tutoring, practice questions, custom study plans & career roadmaps
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <Button
            variant={activeTab === 'chat' ? 'ai' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('chat')}
            className="gap-2"
          >
            <Bot className="h-4 w-4" /> Academic Q&A
          </Button>
          <Button
            variant={activeTab === 'questions' ? 'ai' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('questions')}
            className="gap-2"
          >
            <HelpCircle className="h-4 w-4" /> Question Generator
          </Button>
          <Button
            variant={activeTab === 'study_plan' ? 'ai' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('study_plan')}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" /> Study Planner
          </Button>
          <Button
            variant={activeTab === 'roadmap' ? 'ai' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('roadmap')}
            className="gap-2"
          >
            <Compass className="h-4 w-4" /> Learning Roadmap
          </Button>
        </div>

        {/* Tab 1: Academic Q&A Chat */}
        {activeTab === 'chat' && (
          <Card className="h-[500px] flex flex-col justify-between">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" /> AI Academic Tutor
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.sender === 'user'
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-accent/60 border border-border text-foreground'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-accent/60 px-4 py-2 text-xs text-muted-foreground animate-pulse">
                    Gemini AI is thinking...
                  </div>
                </div>
              )}
            </CardContent>
            <form onSubmit={handleSendChat} className="p-4 border-t border-border/50 flex gap-2">
              <Input
                placeholder="Ask about data structures, formulas, or project ideas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="ai" isLoading={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        )}

        {/* Tab 2: Question Generator */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Generator Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Subject"
                  placeholder="Data Structures"
                  value={qSubject}
                  onChange={(e) => setQSubject(e.target.value)}
                />
                <Input
                  label="Topic"
                  placeholder="Binary Trees & AVL Trees"
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                />
                <Button onClick={handleGenerateQuestions} variant="ai" className="w-full" isLoading={isLoading}>
                  Generate 5 Questions
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Generated Questions</CardTitle>
              </CardHeader>
              <CardContent className="h-80 overflow-y-auto font-mono text-xs whitespace-pre-wrap text-foreground">
                {generatedQuestions || 'Click "Generate" to produce questions with answer keys.'}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 3: Study Planner */}
        {activeTab === 'study_plan' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Study Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Weak Subjects (comma separated)"
                  value={weakSubjects}
                  onChange={(e) => setWeakSubjects(e.target.value)}
                />
                <Button onClick={handleGenerateStudyPlan} variant="ai" className="w-full" isLoading={isLoading}>
                  Build Custom Schedule
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Personalized Study Plan</CardTitle>
              </CardHeader>
              <CardContent className="h-80 overflow-y-auto text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                {studyPlan || 'Enter your weak subjects and generate a personalized weekly revision schedule.'}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 4: Roadmap */}
        {activeTab === 'roadmap' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Roadmap Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Target Field / Tech Stack"
                  value={roadmapSubject}
                  onChange={(e) => setRoadmapSubject(e.target.value)}
                  placeholder="e.g. Full-Stack Web Development"
                />
                <Button onClick={handleGenerateRoadmap} variant="ai" className="w-full" isLoading={isLoading}>
                  Generate Career Roadmap
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Career Roadmap</CardTitle>
              </CardHeader>
              <CardContent className="h-80 overflow-y-auto text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                {roadmap || 'Generate a step-by-step learning roadmap tailored for engineering students.'}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
