// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MemoryBinding, MemoryResolvedBinding } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../context/ToastContext";
import { ProjectMemorySettings } from "./ProjectMemorySettings";

const memoryApiMocks = vi.hoisted(() => ({
  listBindings: vi.fn(),
  listTargets: vi.fn(),
  getProjectBinding: vi.fn(),
  setProjectBinding: vi.fn(),
}));

vi.mock("../api/memory", () => ({
  memoryApi: memoryApiMocks,
}));

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = vi.fn();

function tick() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function createBinding(overrides: Partial<MemoryBinding> = {}): MemoryBinding {
  return {
    id: "binding-qmd",
    companyId: "company-1",
    key: "qmd-default",
    name: "QMD default",
    providerKey: "qmd_memory",
    config: {},
    enabled: true,
    createdAt: new Date("2026-04-20T00:00:00.000Z"),
    updatedAt: new Date("2026-04-20T00:00:00.000Z"),
    ...overrides,
  };
}

function createResolvedBinding(overrides: Partial<MemoryResolvedBinding> = {}): MemoryResolvedBinding {
  return {
    companyId: "company-1",
    targetType: "company",
    targetId: "company-1",
    binding: createBinding(),
    source: "company_default",
    checkedTargetTypes: ["project", "company"],
    ...overrides,
  };
}

describe("ProjectMemorySettings", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    memoryApiMocks.listBindings.mockReset();
    memoryApiMocks.listTargets.mockReset();
    memoryApiMocks.getProjectBinding.mockReset();
    memoryApiMocks.setProjectBinding.mockReset();
    memoryApiMocks.listTargets.mockResolvedValue([]);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
  });

  it("shows inherited company memory and saves a project override", async () => {
    const binding = createBinding();
    memoryApiMocks.listBindings.mockResolvedValue([binding]);
    memoryApiMocks.listTargets.mockResolvedValue([
      {
        id: "target-agent",
        companyId: "company-1",
        bindingId: binding.id,
        targetType: "agent",
        targetId: "agent-1",
        createdAt: new Date("2026-04-20T00:00:00.000Z"),
        updatedAt: new Date("2026-04-20T00:00:00.000Z"),
      },
    ]);
    memoryApiMocks.getProjectBinding.mockResolvedValue(createResolvedBinding());
    memoryApiMocks.setProjectBinding.mockResolvedValue({
      id: "target-project",
      companyId: "company-1",
      bindingId: binding.id,
      targetType: "project",
      targetId: "project-1",
      createdAt: new Date("2026-04-20T00:00:00.000Z"),
      updatedAt: new Date("2026-04-20T00:00:00.000Z"),
    });

    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ProjectMemorySettings companyId="company-1" projectId="project-1" companyPrefix="PAP" />
          </ToastProvider>
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await tick();
      await tick();
    });

    expect(container.textContent).toContain("QMD default (qmd_memory)");
    expect(container.textContent).toContain("Source: Company default");
    expect(container.textContent).toContain("Company default");
    expect(container.textContent).toContain("Project override");
    expect(container.textContent).toContain("Agent overrides");
    expect(container.textContent).toContain("1 agent override configured.");
    expect(container.querySelector('a[href="/PAP/memories?projectId=project-1"]')?.textContent).toContain(
      "See memories for this project",
    );

    const selectTrigger = container.querySelector('[data-slot="select-trigger"]');
    expect(selectTrigger).not.toBeNull();

    await act(async () => {
      selectTrigger!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      await tick();
      const bindingItem = Array.from(document.body.querySelectorAll('[data-slot="select-item"]')).find((item) =>
        item.textContent?.includes("QMD default")
      );
      expect(bindingItem).toBeTruthy();
      bindingItem!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      bindingItem!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await tick();
    });

    expect(container.textContent).toContain("New runs will use");
    expect(container.textContent).toContain("Switching will not affect existing records.");

    const saveButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save override")
    );
    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await tick();
    });

    expect(memoryApiMocks.setProjectBinding).toHaveBeenCalledWith("project-1", binding.id);

    await act(async () => {
      root.unmount();
    });
  });

  it("shows a company settings CTA when no bindings exist", async () => {
    memoryApiMocks.listBindings.mockResolvedValue([]);
    memoryApiMocks.getProjectBinding.mockResolvedValue(
      createResolvedBinding({
        targetType: null,
        targetId: null,
        binding: null,
        source: "unconfigured",
      }),
    );

    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ProjectMemorySettings companyId="company-1" projectId="project-1" companyPrefix="PAP" />
          </ToastProvider>
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await tick();
      await tick();
    });

    expect(container.textContent).toContain("Create a memory binding before setting an override.");
    const companySettingsLinks = Array.from(container.querySelectorAll('a[href="/PAP/company/settings#memory"]'));
    expect(companySettingsLinks.some((link) => link.textContent?.includes("Create a binding in Company Settings")))
      .toBe(true);
    expect(memoryApiMocks.setProjectBinding).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it("shows an error state with retry", async () => {
    memoryApiMocks.listBindings.mockRejectedValue(new Error("Bindings unavailable"));
    memoryApiMocks.getProjectBinding.mockResolvedValue(createResolvedBinding());

    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ProjectMemorySettings companyId="company-1" projectId="project-1" companyPrefix="PAP" />
          </ToastProvider>
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await tick();
      await tick();
    });

    expect(container.textContent).toContain("Bindings unavailable");
    const retryButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Retry")
    );
    expect(retryButton).toBeTruthy();

    await act(async () => {
      root.unmount();
    });
  });
});
