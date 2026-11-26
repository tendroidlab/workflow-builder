import { asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  apiKeys,
  accounts as authAccounts,
  integrations,
  users,
  workflowExecutionLogs,
  workflowExecutions,
  workflows,
} from "@/lib/db/schema";
import { redactSensitiveData } from "@/lib/utils/redact";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const [
      profile,
      linkedAccounts,
      userWorkflows,
      executions,
      executionLogs,
      userIntegrations,
      keys,
    ] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
          isAnonymous: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.query.accounts.findMany({
        where: eq(authAccounts.userId, userId),
        columns: {
          id: true,
          accountId: true,
          providerId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.query.workflows.findMany({
        where: eq(workflows.userId, userId),
        orderBy: [desc(workflows.updatedAt)],
      }),
      db.query.workflowExecutions.findMany({
        where: eq(workflowExecutions.userId, userId),
        columns: {
          id: true,
          workflowId: true,
          status: true,
          input: true,
          output: true,
          startedAt: true,
          completedAt: true,
          duration: true,
        },
        orderBy: [desc(workflowExecutions.startedAt)],
      }),
      db
        .select({
          id: workflowExecutionLogs.id,
          executionId: workflowExecutionLogs.executionId,
          nodeId: workflowExecutionLogs.nodeId,
          nodeName: workflowExecutionLogs.nodeName,
          nodeType: workflowExecutionLogs.nodeType,
          status: workflowExecutionLogs.status,
          input: workflowExecutionLogs.input,
          output: workflowExecutionLogs.output,
          startedAt: workflowExecutionLogs.startedAt,
          completedAt: workflowExecutionLogs.completedAt,
          duration: workflowExecutionLogs.duration,
          timestamp: workflowExecutionLogs.timestamp,
        })
        .from(workflowExecutionLogs)
        .innerJoin(
          workflowExecutions,
          eq(workflowExecutionLogs.executionId, workflowExecutions.id)
        )
        .where(eq(workflowExecutions.userId, userId))
        .orderBy(asc(workflowExecutionLogs.timestamp)),
      db.query.integrations.findMany({
        where: eq(integrations.userId, userId),
        columns: {
          id: true,
          name: true,
          type: true,
          isManaged: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.query.apiKeys.findMany({
        where: eq(apiKeys.userId, userId),
        columns: {
          id: true,
          name: true,
          keyPrefix: true,
          createdAt: true,
          lastUsedAt: true,
        },
      }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      linkedAccounts,
      workflows: userWorkflows.map((workflow) => ({
        ...workflow,
        nodes: redactSensitiveData(workflow.nodes),
        edges: redactSensitiveData(workflow.edges),
      })),
      executions: executions.map((execution) => ({
        ...execution,
        input: redactSensitiveData(execution.input),
        output: redactSensitiveData(execution.output),
      })),
      executionLogs: executionLogs.map((log) => ({
        ...log,
        input: redactSensitiveData(log.input),
        output: redactSensitiveData(log.output),
      })),
      integrations: userIntegrations,
      apiKeys: keys,
      excludedData: [
        "Integration credentials, authentication tokens, and API key hashes or full values are not included.",
        "Execution error messages are omitted because they may contain sensitive details.",
      ],
    };

    return NextResponse.json(exportData, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="workflow-builder-data-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Failed to export account data:", error);
    return NextResponse.json(
      { error: "Failed to export account data" },
      { status: 500 }
    );
  }
}
