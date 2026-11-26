"use client";

import { CheckCircle2, Pencil, Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DeleteConnectionOverlay,
  EditConnectionOverlay,
} from "@/components/overlays/edit-connection-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import { Button } from "@/components/ui/button";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import { Spinner } from "@/components/ui/spinner";
import { api, type Integration } from "@/lib/api-client";
import { getIntegrationLabels } from "@/plugins";

// System integrations that don't have plugins
const SYSTEM_INTEGRATION_LABELS: Record<string, string> = {
  database: "Database",
};

type IntegrationsManagerProps = {
  onIntegrationChange?: () => void;
  filter?: string;
};

type IntegrationTestResult = {
  status: "success" | "error";
  message: string;
};

function IntegrationTestFeedback({
  result,
}: {
  result: IntegrationTestResult;
}) {
  const isSuccess = result.status === "success";
  const StatusIcon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <output
      aria-live="polite"
      className={`flex items-start gap-1.5 pl-6 text-xs ${
        isSuccess ? "text-primary" : "text-destructive"
      }`}
    >
      <StatusIcon aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
      <span className="break-words">
        {isSuccess ? "Connection verified" : "Check failed"}: {result.message}
      </span>
    </output>
  );
}

export function IntegrationsManager({
  onIntegrationChange,
  filter = "",
}: IntegrationsManagerProps) {
  const { push } = useOverlay();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, IntegrationTestResult>
  >({});

  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.integration.getAll();
      setIntegrations(data);
    } catch (error) {
      console.error("Failed to load integrations:", error);
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const clearTestResult = (id: string) => {
    setTestResults((current) => {
      if (!current[id]) {
        return current;
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  // Get integrations with their labels, sorted by label then name
  const integrationsWithLabels = useMemo(() => {
    const labels = getIntegrationLabels() as Record<string, string>;
    const filterLower = filter.toLowerCase();

    return integrations
      .map((integration) => ({
        ...integration,
        label:
          labels[integration.type] ||
          SYSTEM_INTEGRATION_LABELS[integration.type] ||
          integration.type,
      }))
      .filter((integration) => {
        if (!filter) {
          return true;
        }
        return (
          integration.label.toLowerCase().includes(filterLower) ||
          integration.name.toLowerCase().includes(filterLower) ||
          integration.type.toLowerCase().includes(filterLower)
        );
      })
      .sort((a, b) => {
        const labelCompare = a.label.localeCompare(b.label);
        if (labelCompare !== 0) {
          return labelCompare;
        }
        return a.name.localeCompare(b.name);
      });
  }, [integrations, filter]);

  const handleEdit = (integration: Integration) => {
    push(EditConnectionOverlay, {
      integration,
      onSuccess: () => {
        clearTestResult(integration.id);
        loadIntegrations();
        onIntegrationChange?.();
      },
      onDelete: () => {
        clearTestResult(integration.id);
        loadIntegrations();
        onIntegrationChange?.();
      },
    });
  };

  const handleDelete = (integration: Integration) => {
    push(DeleteConnectionOverlay, {
      integration,
      onSuccess: () => {
        clearTestResult(integration.id);
        loadIntegrations();
        onIntegrationChange?.();
      },
    });
  };

  const handleTest = async (id: string) => {
    try {
      setTestingId(id);
      setTestResults((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });

      const result = await api.integration.testConnection(id);
      setTestResults((current) => ({ ...current, [id]: result }));

      if (result.status === "success") {
        toast.success(result.message || "Connection successful");
      } else {
        toast.error(result.message || "Connection test failed");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      const message =
        error instanceof Error ? error.message : "Connection test failed";
      setTestResults((current) => ({
        ...current,
        [id]: { status: "error", message },
      }));
      toast.error(message);
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  const renderIntegrationsList = () => {
    if (integrations.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            No connections configured yet
          </p>
        </div>
      );
    }

    if (integrationsWithLabels.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            No connections match your filter
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {integrationsWithLabels.map((integration) => (
          <div
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5"
            key={integration.id}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-2">
                <IntegrationIcon
                  className="size-4 shrink-0"
                  integration={
                    integration.type === "ai-gateway"
                      ? "vercel"
                      : integration.type
                  }
                />
                <span className="shrink-0 font-medium text-sm">
                  {integration.label}
                </span>
                <span className="truncate text-muted-foreground text-sm">
                  {integration.name}
                </span>
              </div>
              {testResults[integration.id] && (
                <IntegrationTestFeedback result={testResults[integration.id]} />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                aria-label={`Test ${integration.name} connection`}
                className="h-7 px-2"
                disabled={testingId !== null}
                onClick={() => handleTest(integration.id)}
                size="sm"
                variant="outline"
              >
                {testingId === integration.id ? (
                  <Spinner className="size-3" />
                ) : (
                  <span className="text-xs">Test</span>
                )}
              </Button>
              <Button
                aria-label={`Edit ${integration.name}`}
                className="size-7"
                onClick={() => handleEdit(integration)}
                size="icon"
                variant="outline"
              >
                <Pencil className="size-3" />
              </Button>
              <Button
                aria-label={`Delete ${integration.name}`}
                className="size-7"
                onClick={() => handleDelete(integration)}
                size="icon"
                variant="outline"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return <div className="space-y-1">{renderIntegrationsList()}</div>;
}
