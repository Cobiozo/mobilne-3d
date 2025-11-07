import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SolanaPayButtonProps {
  orderId: string;
  totalAmount: number;
  config: {
    recipient_wallet: string;
    token_mint: string;
    token_symbol: string;
    token_decimals: number;
    network: string;
    price_per_token: number;
  };
  onSuccess: (signature: string) => void;
  onError: (error: string) => void;
}

export const SolanaPayButton = ({
  orderId,
  totalAmount,
  config,
  onSuccess,
  onError,
}: SolanaPayButtonProps) => {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const tokensRequired = totalAmount / config.price_per_token;
  const tokensWithDecimals = Math.ceil(tokensRequired * Math.pow(10, config.token_decimals));

  const getRpcUrl = () => {
    if (config.network === "devnet") return "https://api.devnet.solana.com";
    if (config.network === "testnet") return "https://api.testnet.solana.com";
    return "https://api.mainnet-beta.solana.com";
  };

  const handlePayment = async () => {
    if (!publicKey || !connected) {
      toast.error("Połącz portfel Solana");
      return;
    }

    setLoading(true);
    try {
      const connection = new Connection(getRpcUrl(), "confirmed");
      const recipientPubkey = new PublicKey(config.recipient_wallet);
      const tokenMintPubkey = new PublicKey(config.token_mint);

      // Get associated token accounts
      const senderTokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        publicKey
      );

      const recipientTokenAccount = await getAssociatedTokenAddress(
        tokenMintPubkey,
        recipientPubkey
      );

      // Create transfer instruction
      const transferInstruction = createTransferCheckedInstruction(
        senderTokenAccount,
        tokenMintPubkey,
        recipientTokenAccount,
        publicKey,
        tokensWithDecimals,
        config.token_decimals
      );

      const transaction = new Transaction().add(transferInstruction);
      transaction.feePayer = publicKey;

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      console.log(`Sending ${tokensRequired} ${config.token_symbol} to ${config.recipient_wallet}`);
      
      const sig = await sendTransaction(transaction, connection);
      setSignature(sig);

      toast.success("Transakcja wysłana! Oczekiwanie na potwierdzenie...");

      // Wait for confirmation
      setVerifying(true);
      const confirmation = await connection.confirmTransaction(sig, "confirmed");

      if (confirmation.value.err) {
        throw new Error("Transakcja nie powiodła się");
      }

      console.log("Transaction confirmed:", sig);

      // Verify payment via edge function
      const { data, error } = await supabase.functions.invoke("solana-payment", {
        body: {
          orderId,
          signature: sig,
          expectedAmount: tokensWithDecimals,
          tokenMint: config.token_mint,
          recipientWallet: config.recipient_wallet,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Płatność potwierdzona!");
        onSuccess(sig);
      } else {
        throw new Error(data?.error || "Weryfikacja płatności nie powiodła się");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      const errorMessage = error?.message || "Błąd podczas płatności";
      toast.error(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Płatność Crypto (Solana)</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Do zapłaty: <span className="font-semibold text-foreground">{tokensRequired.toFixed(config.token_decimals)} {config.token_symbol}</span></p>
          <p>Przelicznik: 1 {config.token_symbol} = {config.price_per_token} PLN</p>
          <p>Wartość: {totalAmount.toFixed(2)} PLN</p>
        </div>
      </div>

      {!connected ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Połącz portfel Solana aby dokonać płatności</p>
          <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !rounded-md !h-10 !px-4" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Portfel połączony: {publicKey?.toString().slice(0, 8)}...</span>
          </div>

          <Button
            onClick={handlePayment}
            disabled={loading || verifying}
            className="w-full"
            size="lg"
          >
            {loading || verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {verifying ? "Weryfikacja płatności..." : "Wysyłanie..."}
              </>
            ) : (
              `Zapłać ${tokensRequired.toFixed(config.token_decimals)} ${config.token_symbol}`
            )}
          </Button>

          {signature && (
            <a
              href={`https://solscan.io/tx/${signature}${config.network !== "mainnet-beta" ? `?cluster=${config.network}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Zobacz transakcję <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p>• Transakcja jest nieodwracalna po potwierdzeniu</p>
        <p>• Potwierdzenie zajmuje ~5-30 sekund</p>
        <p>• Opłata sieciowa: ~$0.00025</p>
      </div>
    </Card>
  );
};
