-- Tạo bảng để lưu thông tin link đã chuẩn hóa và vector tương ứng
create table public.FL_links (
    id bigint generated always as identity primary key, -- ID tự động tăng
    url text not null, -- Đường dẫn (Link)
    title text, -- Tiêu đề (AI đã chuẩn hóa)
    content text, -- Mô tả ngắn (AI đã chuẩn hóa)
    deadline date, -- Hạn chót (Định dạng YYYY-MM-DD, có thể để trống)
    embedding vector (768), -- Ô lưu mảng 768 số của Google text-embedding-04
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
);

-- Tạo hàm tìm kiếm bằng thuật toán Cosine Distance
create or replace function match_links (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  url text,
  title text,
  content text,
  deadline date,
  similarity float -- Trả về thêm điểm số giống nhau (từ 0 đến 1)
)
language sql stable
as $$
  select
    FL_links.id,
    FL_links.url,
    FL_links.title,
    FL_links.content,
    FL_links.deadline,
    1 - (FL_links.embedding <=> query_embedding) as similarity -- Phép toán tính độ tương đồng
  from FL_links
  where 1 - (FL_links.embedding <=> query_embedding) > match_threshold
  order by FL_links.embedding <=> query_embedding asc
  limit match_count;
$$;

create table public.fl_users (
    id bigint generated always as identity primary key,
    username text not null unique,
    password text not null,
    role text not null check (role in ('admin', 'manager')),
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null
);

DROP FUNCTION match_links ( vector, double precision, integer );
-- 1. Thêm cột click_count vào bảng fl_links
ALTER TABLE public.fl_links ADD COLUMN click_count integer DEFAULT 0;
-- 2. Cập nhật lại hàm match_links để trả về cột click_count
CREATE OR REPLACE FUNCTION match_links (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  url text,
  title text,
  content text,
  deadline date,
  click_count int,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    fl_links.id,
    fl_links.url,
    fl_links.title,
    fl_links.content,
    fl_links.deadline,
    fl_links.click_count,
    1 - (fl_links.embedding <=> query_embedding) AS similarity
  FROM fl_links
  WHERE 1 - (fl_links.embedding <=> query_embedding) > match_threshold
  ORDER BY fl_links.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;