import { toast } from "sonner";

export async function handleApiResponse<T = any>(res: Response, successMessage?: string): Promise<T> {
    if (!res.ok) {
        let errorData;
        try {
            errorData = await res.json();
        } catch (e) {
            errorData = null;
        }

        const errorMsg = errorData?.error || "Có lỗi xảy ra";
        throw new Error(errorMsg);
    }

    let data;
    try {
        data = await res.json();
    } catch (e) {
        data = null;
    }

    const finalSuccessMsg = data?.message || successMessage;
    if (finalSuccessMsg) {
        toast.success(finalSuccessMsg);
    }

    return data as T;
}
