import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import TopBar from "@/components/TopBar";
import SkeletonLoader from "@/components/SkeletonLoader";
import ErrorCard from "@/components/ErrorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Search, RefreshCw, Loader2, Link } from "lucide-react";
import { cn } from "@/lib/utils";

const BlockchainPage = () => {
  const [chain, setChain] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState(false);

  const fetchChain = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await api.getBlockchain();
      setChain(data);
      setBlocks(data?.chain || data?.blocks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChain(); }, [fetchChain]);

  const verifyChain = async () => {
    setVerifying(true);
    await fetchChain();
    setVerifying(false);
  };

  const truncateHash = (hash: string) => {
    if (!hash || hash.length < 24) return hash || "—";
    return hash.slice(0, 16) + "..." + hash.slice(-8);
  };

  const filteredBlocks = search
    ? blocks.filter((b) => b.device_id?.toLowerCase().includes(search.toLowerCase()))
    : blocks;

  const sortedBlocks = [...filteredBlocks].reverse();

  // Format UTC string nicely
  const formatDate = (isoStr: string) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString();
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <TopBar title="Audit Ledger Explorer" />
      <div className="p-6 space-y-5">
        {loading ? (
          <SkeletonLoader rows={8} cols={3} />
        ) : error ? (
          <ErrorCard message={error} onRetry={fetchChain} />
        ) : (
          <>
            {/* Status Banner */}
            <div className="soc-card p-5 border border-[#1e293b] flex items-center justify-between bg-[#090e1a]">
              <div className="flex items-center gap-3">
                {chain?.chain_valid !== false ? (
                  <CheckCircle className="h-6 w-6 text-[#10b981]" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive animate-pulse" />
                )}
                <div>
                  <p className={cn("text-sm font-bold uppercase tracking-wider", chain?.chain_valid !== false ? "text-[#10b981]" : "text-destructive")}>
                    {chain?.chain_valid !== false ? "Ledger Validation: Passed" : "Ledger Validation: Tamper Detected"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{blocks.length} blocks committed to immutable ledger</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={verifyChain}
                disabled={verifying}
                className="h-8 border-[#1e293b] text-foreground hover:bg-accent/40 font-mono text-[10px] font-bold uppercase tracking-wider"
              >
                {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                VERIFY INTEGRITY
              </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by terminal node ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 cyber-input font-mono text-xs py-4"
              />
            </div>

            {/* Blocks */}
            {sortedBlocks.length === 0 ? (
              <div className="soc-card border border-[#1e293b] p-12 text-center">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">No ledger blocks found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedBlocks.map((block: any, i: number) => {
                  const isGenesis = block.device_id === "GENESIS" || block.key_status === "GENESIS" || block.id === 1;
                  return (
                    <div
                      key={block.id ?? i}
                      className={cn(
                        "soc-card p-5 border border-[#1e293b] bg-[#090e1a]/85 transition-all duration-200",
                        isGenesis ? "border-l-2 border-l-[#3b82f6]" : "hover:border-slate-500"
                      )}
                    >
                      <div className="flex items-center justify-between mb-4 border-b border-[#1e293b]/45 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-secondary text-foreground text-[10px] font-bold font-mono px-2 py-0.5 rounded border border-[#1e293b]">
                            BLOCK #{block.id}
                          </span>
                          {isGenesis ? (
                            <span className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider font-mono">Genesis Block</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Telemetry Entry</span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                            block.key_status === "ACTIVE" && "status-active",
                            block.key_status === "GENESIS" && "bg-blue-950/40 text-blue-400 border-blue-900/40",
                            block.key_status === "REVOKED" && "status-locked"
                          )}
                        >
                          {block.key_status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-[#1e293b]/20 md:border-b-0 pb-1.5 md:pb-0">
                          <span className="text-muted-foreground uppercase font-mono text-[10px]">Terminal Node ID:</span>
                          <span className="font-mono text-foreground font-bold">{block.device_id || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-[#1e293b]/20 md:border-b-0 pb-1.5 md:pb-0">
                          <span className="text-muted-foreground uppercase font-mono text-[10px]">Cryptographic Version:</span>
                          <span className="text-foreground font-bold font-mono">v{block.key_version}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-[#1e293b]/20 md:border-b-0 pb-1.5 md:pb-0 md:col-span-2">
                          <span className="text-muted-foreground uppercase font-mono text-[10px] mr-4">Current Block Hash:</span>
                          <span className="font-mono text-foreground font-bold break-all select-all text-right">{block.block_hash}</span>
                        </div>
                        <div className="flex items-center justify-between md:col-span-2">
                          <span className="text-muted-foreground uppercase font-mono text-[10px] mr-4">Previous Block Hash:</span>
                          <span className="font-mono text-muted-foreground break-all select-all text-right">{block.previous_hash}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[#1e293b]/20 text-[10px] text-muted-foreground/60 font-mono">
                        <Link className="h-3 w-3" />
                        <span>Committed at: {formatDate(block.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BlockchainPage;

