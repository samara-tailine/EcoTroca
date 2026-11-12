import { useCallback } from "react";
import { Link, useLocation, useParams } from "react-router";
import { paymentsApi } from "../services/payments";
import { PaymentReceipt } from "../components/PaymentReceipt";
import { useRemoteData } from "../hooks/useRemoteData";
import { StudentError, StudentLoading } from "../components/student/StudentUI";
export function PaymentReceiptPage() {
  const { id = "" } = useParams();
  const { pathname } = useLocation();
  const load = useCallback(
    (signal: AbortSignal) => paymentsApi.receipt(id, signal),
    [id],
  );
  const remote = useRemoteData(load);
  return (
    <div className="space-y-6">
      <Link
        className="text-action"
        to={
          pathname.startsWith("/xerox")
            ? "/xerox/payments"
            : "/student/ecocoins"
        }
      >
        ← Voltar ao histórico
      </Link>
      {remote.loading && <StudentLoading />}
      {remote.error && (
        <StudentError message={remote.error} retry={remote.reload} />
      )}
      {remote.data && <PaymentReceipt receipt={remote.data} />}
    </div>
  );
}
