import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { ArrowRight, Target, TrendingUp, Award, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-12 h-12" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Platinum HERCM
            </span>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-gradient-to-r from-primary to-accent"
            data-testid="button-login"
          >
            Login / Sign Up
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
            Transform Your Life with HERCM
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Master Health, Relationships, Career, and Money through AI-powered belief transformation and weekly progression tracking
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="bg-gradient-to-r from-primary to-accent text-lg"
              data-testid="button-get-started"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <Card className="p-6 text-center hover-elevate">
            <Target className="w-12 h-12 mx-auto text-emerald-600 dark:text-emerald-400 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Health Mastery</h3>
            <p className="text-sm text-muted-foreground">
              Build sustainable habits and transform limiting health beliefs
            </p>
          </Card>

          <Card className="p-6 text-center hover-elevate">
            <Users className="w-12 h-12 mx-auto text-pink-600 dark:text-pink-400 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Deep Connections</h3>
            <p className="text-sm text-muted-foreground">
              Strengthen relationships with AI-guided affirmations
            </p>
          </Card>

          <Card className="p-6 text-center hover-elevate">
            <TrendingUp className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Career Growth</h3>
            <p className="text-sm text-muted-foreground">
              Unlock your potential with personalized action plans
            </p>
          </Card>

          <Card className="p-6 text-center hover-elevate">
            <Award className="w-12 h-12 mx-auto text-amber-600 dark:text-amber-400 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Financial Freedom</h3>
            <p className="text-sm text-muted-foreground">
              Master money mindset and build lasting wealth
            </p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Card className="p-12 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Begin Your Transformation?
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Join thousands of users achieving their Platinum standards
            </p>
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="bg-gradient-to-r from-primary to-accent"
              data-testid="button-cta-login"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Platinum HERCM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
