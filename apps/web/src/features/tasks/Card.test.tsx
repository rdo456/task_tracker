import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Task } from "@jira-lite/shared";
import { Card, SkeletonCard } from "./Card";

function makeTask(override: Partial<Task> = {}): Task {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    key: "TASK-1",
    title: "sample title",
    description: null,
    status: "ready",
    priority: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...override,
  };
}

describe("Card", () => {
  it("user can see card data", () => {
    render(<Card task={makeTask({ title: "Test title", priority: 2 })} />);

    expect(screen.getByText("Test title")).toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
  });

  it("User clicks card", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Card task={makeTask({ title: "TEST CLICK" })} onClick={onClick} />);

    await user.click(screen.getByText("TEST CLICK"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

void Card;
void SkeletonCard;
