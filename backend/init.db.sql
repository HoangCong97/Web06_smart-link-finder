-- Tạo bảng để lưu thông tin link đã chuẩn hóa và vector tương ứng
create table public.fl_links (
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
    fl_links.id,
    fl_links.url,
    fl_links.title,
    fl_links.content,
    fl_links.deadline,
    1 - (fl_links.embedding <=> query_embedding) as similarity -- Phép toán tính độ tương đồng
  from fl_links
  where 1 - (fl_links.embedding <=> query_embedding) > match_threshold
  order by fl_links.embedding <=> query_embedding asc
  limit match_count;
$$;