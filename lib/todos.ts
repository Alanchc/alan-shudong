import { supabase } from "./supabase";
import { currentUserId, requireUserId } from "./auth";

export type Todo = {
  id: string;
  body: string;
  done: boolean;
  dueDate: string | null;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  body: string;
  done: boolean;
  due_date: string | null;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id,body,done,due_date,done_at,created_at,updated_at";

function toTodo(row: Row): Todo {
  return {
    id: row.id,
    body: row.body,
    done: row.done,
    dueDate: row.due_date,
    doneAt: row.done_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTodos(): Promise<Todo[]> {
  const me = await currentUserId();
  if (!me) return [];

  const { data, error } = await supabase
    .from("todos")
    .select(COLUMNS)
    .eq("user_id", me)
    .order("done", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(toTodo);
}

export async function createTodo(body: string, dueDate: string | null): Promise<Todo> {
  const me = await requireUserId();

  const { data, error } = await supabase
    .from("todos")
    .insert({ user_id: me, body, due_date: dueDate })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toTodo(data as Row);
}

export async function setTodoDone(id: string, done: boolean): Promise<Todo> {
  const { data, error } = await supabase
    .from("todos")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toTodo(data as Row);
}

export async function updateTodo(
  id: string,
  body: string,
  dueDate: string | null,
): Promise<Todo> {
  const { data, error } = await supabase
    .from("todos")
    .update({ body, due_date: dueDate, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toTodo(data as Row);
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw error;
}

export async function listDoneToday(): Promise<Todo[]> {
  const me = await currentUserId();
  if (!me) return [];

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("todos")
    .select(COLUMNS)
    .eq("user_id", me)
    .eq("done", true)
    .gte("done_at", start.toISOString())
    .order("done_at", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(toTodo);
}
