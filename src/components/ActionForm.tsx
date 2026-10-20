"use client";

import { useActionState, type ReactNode } from "react";
import { FormMessage, type ActionState } from "./form";

/** Server Action の結果メッセージをフォーム内に表示する汎用フォーム */
export function ActionForm({
  action,
  children,
  className = "",
  confirmMessage,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
      {(state.message || state.errors) && (
        <div className="mt-2 basis-full">
          <FormMessage state={state.message ? state : { ok: false, message: Object.values(state.errors ?? {})[0] }} />
        </div>
      )}
    </form>
  );
}
