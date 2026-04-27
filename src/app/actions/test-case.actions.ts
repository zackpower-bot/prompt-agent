"use server"

import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import type { Check, TestCaseDTO, VariablesMap } from "@/lib/test-case"
import { serializeTestCase, stringifyChecks, stringifyVariables } from "@/lib/test-case"

export interface CreateTestCaseInput {
  promptId: string
  name?: string
  userMessage?: string
  variables?: VariablesMap
  expectation?: string | null
  checks?: Check[]
}

export interface UpdateTestCaseInput {
  name?: string
  userMessage?: string
  variables?: VariablesMap
  expectation?: string | null
  checks?: Check[]
}

export async function getTestCasesByPrompt(
  promptId: string
): Promise<{ success: true; data: TestCaseDTO[] } | { success: false; error: string }> {
  try {
    const rows = await prisma.testCase.findMany({
      where: { promptId },
      orderBy: { createdAt: "asc" },
    })
    return { success: true, data: rows.map(serializeTestCase) }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function listTestCases(
  promptId: string
): Promise<{ success: true; data: TestCaseDTO[] } | { success: false; error: string }> {
  return getTestCasesByPrompt(promptId)
}

export async function getTestCaseById(
  id: string
): Promise<{ success: true; data: TestCaseDTO } | { success: false; error: string }> {
  try {
    const record = await prisma.testCase.findUnique({ where: { id } })
    if (!record) return { success: false, error: "Test case not found" }
    return { success: true, data: serializeTestCase(record) }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function createTestCase(
  input: CreateTestCaseInput
): Promise<{ success: true; data: TestCaseDTO } | { success: false; error: string }> {
  try {
    const prompt = await prisma.prompt.findUnique({ where: { id: input.promptId } })
    if (!prompt) return { success: false, error: "Prompt not found" }

    const row = await prisma.testCase.create({
      data: {
        promptId: input.promptId,
        name: input.name?.trim() || "Untitled test case",
        userMessage: input.userMessage ?? "",
        variables: stringifyVariables(input.variables),
        expectation: input.expectation ?? null,
        checks: stringifyChecks(input.checks),
      },
    })
    return { success: true, data: serializeTestCase(row) }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function updateTestCase(
  id: string,
  input: UpdateTestCaseInput
): Promise<{ success: true; data: TestCaseDTO } | { success: false; error: string }> {
  try {
    const existing = await prisma.testCase.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Test case not found" }

    const row = await prisma.testCase.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() || "Untitled test case" }),
        ...(input.userMessage !== undefined && { userMessage: input.userMessage }),
        ...(input.variables !== undefined && { variables: stringifyVariables(input.variables) }),
        ...(input.expectation !== undefined && { expectation: input.expectation ?? null }),
        ...(input.checks !== undefined && { checks: stringifyChecks(input.checks) }),
      },
    })
    return { success: true, data: serializeTestCase(row) }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function deleteTestCase(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await prisma.testCase.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, error: "Test case not found" }
    }
    return { success: false, error: (error as Error).message }
  }
}
