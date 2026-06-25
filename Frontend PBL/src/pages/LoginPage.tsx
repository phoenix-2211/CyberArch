import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/overview");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Background ambient decorative shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full filter blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="soc-card p-8 border border-border/80">
          <div className="flex flex-col items-center justify-center gap-2 mb-8 border-b border-border/30 pb-6">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 mb-2">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-wider uppercase font-sans text-center">
              CypherGuard <span className="text-primary">SOC</span>
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              Secure Gate Gateway & Monitoring Portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-[11px] font-mono tracking-wider text-muted-foreground uppercase">
                Operator Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Operator ID / Email"
                required
                className="cyber-input font-mono text-sm py-5"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-mono tracking-wider text-muted-foreground uppercase">
                Access Passcode
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="🔑 Enter passcode"
                required
                className="cyber-input font-mono text-sm py-5"
              />
            </div>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 px-4 py-3 rounded-md font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                <span>ERR_AUTH: {error}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full cyber-btn-primary py-6 text-sm font-semibold tracking-wide uppercase mt-2" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  AUTHENTICATING CLIENT...
                </>
              ) : (
                "INITIALIZE SECURE SESSION"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
