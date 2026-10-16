import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CurrencyDisplay } from "./currency-display";
import { Delta } from "./delta";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { TransactionTypeBadge } from "./transaction-type-badge";
import { TypeToggle } from "./type-toggle";

describe("CurrencyDisplay", () => {
  it("signs amounts by type so meaning never depends on colour", () => {
    const { rerender } = render(<CurrencyDisplay value="25000.00" currency="CLP" type="INCOME" />);
    expect(screen.getByText("+$25.000")).toBeInTheDocument();
    rerender(<CurrencyDisplay value="25000.00" currency="CLP" type="EXPENSE" />);
    expect(screen.getByText("−$25.000")).toBeInTheDocument();
  });
});

describe("TransactionTypeBadge", () => {
  it("shows a text label", () => {
    render(<TransactionTypeBadge type="EXPENSE" />);
    expect(screen.getByText("Gasto")).toBeInTheDocument();
  });
});

describe("Delta", () => {
  it("announces direction in text, not only with colour", () => {
    render(<Delta value="-12.50" upIsGood={false} />);
    expect(screen.getByText("bajó")).toBeInTheDocument();
    expect(screen.getByText(/12,5/)).toBeInTheDocument();
  });

  it("explains missing comparisons", () => {
    render(<Delta value={null} />);
    expect(screen.getByText("Sin datos para comparar")).toBeInTheDocument();
  });
});

describe("states", () => {
  it("ErrorState offers a retry button", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar la información");
    await userEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("EmptyState renders title, description and action", () => {
    render(
      <EmptyState
        title="Todavía no tienes movimientos"
        description="Registra tu primer movimiento"
        action={<button type="button">Registrar</button>}
      />,
    );
    expect(screen.getByText("Todavía no tienes movimientos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar" })).toBeInTheDocument();
  });
});

describe("TypeToggle", () => {
  it("is a keyboard-operable radio group", async () => {
    const onChange = vi.fn();
    render(<TypeToggle value="EXPENSE" onChange={onChange} />);
    const expense = screen.getByRole("radio", { name: /gasto/i });
    expect(expense).toHaveAttribute("aria-checked", "true");
    expense.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("INCOME");
  });
});
