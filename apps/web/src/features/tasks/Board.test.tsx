import { beforeEach, describe, it, vi, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("./useTaskBoard");

import { Board } from "./Board";
import useTaskBoards from "./useTaskBoard";

const mockHook = vi.mocked(useTaskBoards);

function mockBoard(overrides: Partial<ReturnType<typeof useTaskBoards>> = {}) {
  mockHook.mockReturnValue({
    tasks: [],
    isLoading: false,
    isMutation: false,
    initialLoadFailed: false,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    archive: vi.fn(),
    ...overrides,
  });
}

describe("Test board", () => {
  it("user see columns", async () => {
    mockBoard();
    render(<Board />);
    const board = within(screen.getByRole("list", { name: /task columns/i }));
    expect(board.getByText("In Code")).toBeInTheDocument();
  });
});
